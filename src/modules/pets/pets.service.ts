import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { BaseService } from '@modules/common/base/base.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Pets } from './entities/pets.entity';
import { PetsDto } from './dto/pets.dto';
import { messages } from 'src/messages/messages';
import { GetFilesByEntityDto } from '@modules/file/file/dto/get-files-entity.dto';
import { FileService } from '@modules/file/file/file.service';
import { AdoptionCenterService } from '@modules/adoption-center/adoption-center.service';
import { PaginationQueryDto } from '@modules/common/dto/pagination/pagination-query.dto';
import { AttributeService } from '@modules/petTypes/attribute.service';
import { PetAttributeValueService } from '@modules/petTypes/pet-attribute-value.service';
import { PetTypeService } from '@modules/petTypes/pet-type.service';

@Injectable()
export class PetsService extends BaseService<Pets, PetsDto> {
  private readonly PET = 'PET';

  constructor(
    @InjectRepository(Pets)
    private readonly petsRepository: Repository<Pets>,
    private readonly fileService: FileService,
    @Inject(forwardRef(() => AdoptionCenterService))
    private readonly adoptionCenterService: AdoptionCenterService,
    private readonly petTypeService: PetTypeService,
    private readonly attributeService: AttributeService,
    private readonly petAttributeValueService: PetAttributeValueService,
  ) {
    super(petsRepository, PetsDto);
  }

  async findAll(pagination: PaginationQueryDto) {
    const paginatedResponse = await super.findAll(pagination);
    const petsIds = paginatedResponse.data.map((item) => item.id);

    if (petsIds.length > 0) {
      const getfileDTO = new GetFilesByEntityDto();
      getfileDTO.entity = this.PET;
      getfileDTO.idEntities = petsIds;
      const files = await this.fileService.getFilesByEntity(getfileDTO);

      const attributeValues =
        await this.petAttributeValueService.findByPetIds(petsIds);

      paginatedResponse.data = await Promise.all(
        paginatedResponse.data.map(async (pet: Partial<Pets>) => {
          const petFiles = await Promise.all(
            files.map(async (file) => ({
              file,
              matches: (await file.getIdEntity()) === pet.id,
            })),
          );

          const adoptionCenter = await this.adoptionCenterService.findOne(
            pet.adoptionCenterId,
          );

          pet = {
            ...pet,
            adoptionCenter,
          };

          const filteredFiles = petFiles
            .filter((f) => f.matches)
            .map((f) => f.file);

          const processedFiles = await Promise.all(
            filteredFiles.map(async (file) => file.toJson()),
          );

          const petAttributes = attributeValues
            .filter((av) => av.pet.id === pet.id)
            .map((av) => ({
              id: av.id,
              value: av.value,
              attribute: {
                id: av.attribute.id,
                name: av.attribute.name,
                allowedValues: av.attribute.allowedValues,
              },
            }));

          return {
            ...pet,
            files: processedFiles,
            attributeValues: petAttributes,
          } as unknown as Partial<Pets>;
        }),
      );
    }

    return paginatedResponse;
  }

  async findOne(id: number): Promise<any> {
    const pet = await this.petsRepository.findOne({
      where: { id },
      relations: [
        'adoptionCenter',
        'petType',
        'attributeValues',
        'attributeValues.attribute',
      ],
    });

    if (!pet) return null;

    const getfileDTO = new GetFilesByEntityDto();
    getfileDTO.entity = this.PET;
    getfileDTO.idEntities = [id];
    const files = await this.fileService.getFilesByEntity(getfileDTO);

    const petDto = new PetsDto(pet);
    petDto.files = await Promise.all(files.map((file) => file.toJson()));

    return petDto.toJson();
  }

  async create(input: DeepPartial<Pets>): Promise<Partial<Pets>> {
    const adoptionCenter = await this.adoptionCenterService.findOne(
      input.adoptionCenterId,
    );
    if (!adoptionCenter) {
      throw new NotFoundException(messages.adoptionCenterNotFound);
    }

    const petType = await this.petTypeService.findOne(input.petType.id);
    if (!petType) {
      throw new NotFoundException(messages.petTypeNotFound);
    }

    const requiredAttributes =
      await this.petTypeService.getAttributesForPetType(input.petType.id);

    const attributeValuesInput = input.attributeValues || [];
    delete input.attributeValues;
    console.log(attributeValuesInput);
    console.log(requiredAttributes);

    const missingAttributes = requiredAttributes.filter(
      (reqAttr) =>
        !attributeValuesInput.some((av) => av.attribute.id === reqAttr.id),
    );

    if (missingAttributes.length > 0) {
      throw new NotFoundException(
        `Missing required attributes: ${missingAttributes.map((a) => a.name).join(', ')}`,
      );
    }

    for (const attrValue of attributeValuesInput) {
      const attribute = requiredAttributes.find(
        (a) => a.id === attrValue.attribute.id,
      );
      if (!attribute) {
        throw new NotFoundException(
          `Attribute with ID ${attrValue.attribute.id} not found for this pet type`,
        );
      }

      if (
        attribute.allowedValues?.length > 0 &&
        !attribute.allowedValues.includes(attrValue.value)
      ) {
        throw new NotFoundException(
          `Invalid value for attribute ${attribute.name}. Allowed values: ${attribute.allowedValues.join(', ')}`,
        );
      }
    }

    const pet = await this.petsRepository.save(
      this.petsRepository.create({
        ...input,
        active: input.active !== undefined ? input.active : true,
      }),
    );

    await this.petAttributeValueService.saveValues(
      pet.id,
      attributeValuesInput,
    );

    return this.findOne(pet.id);
  }

  async update(id: number, input: DeepPartial<Pets>): Promise<Partial<Pets>> {
    const pet = await this.petsRepository.findOne({
      where: { id },
    });

    if (!pet) {
      throw new NotFoundException(messages.petNotFound);
    }

    if (input.petType) {
      const requiredAttributes =
        await this.petTypeService.getAttributesForPetType(input.petType.id);
      const attributeValuesInput = input.attributeValues || [];

      const missingAttributes = requiredAttributes.filter(
        (reqAttr) =>
          !attributeValuesInput.some((av) => av.attribute.id === reqAttr.id),
      );

      if (missingAttributes.length > 0) {
        throw new NotFoundException(
          `Missing required attributes: ${missingAttributes.map((a) => a.name).join(', ')}`,
        );
      }
    }

    const attributeValuesInput = input.attributeValues || [];
    delete input.attributeValues;

    await this.petsRepository.update(id, input);
    await this.petAttributeValueService.updateValues(id, attributeValuesInput);

    return this.findOne(id);
  }

  async findByAdoptionCenterId(id: number) {
    const pets = await this.petsRepository.find({
      where: { adoptionCenterId: id },
    });

    return pets.map((pet) => new PetsDto(pet));
  }
}
