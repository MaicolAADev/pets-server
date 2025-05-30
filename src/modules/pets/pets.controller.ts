import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  Delete,
  Put,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import { messages } from 'src/messages/messages';
import { Role } from '@modules/common/enums/rol.enum';
import { Auth } from '@modules/auth/decorators/auth.decorator';
import { BaseEntityController } from '@modules/common/base/base-entity.controller';
import { PetsService } from './pets.service';
import { PaginationQueryDto } from '@modules/common/dto/pagination/pagination-query.dto';
import { Public } from '@modules/auth/decorators/public.decorator';

@Controller('pets')
export class PetsController extends BaseEntityController {
  protected service = this.petsService;
  protected entityNotFound: string = messages.petNotFound;
  protected entityAlreadyExists: string = messages.petAlreadyExists;
  protected createdMessage: string = messages.petCreated;
  protected updatedMessage: string = messages.petUpdated;
  protected deletedMessage: string = messages.petDeleted;
  protected resourceName: string = 'pet';

  constructor(private readonly petsService: PetsService) {
    super();
  }

  @Get()
  @Public()
  async findAll(@Query() query: PaginationQueryDto, @Res() res: Response) {
    return super.findAll(query, res);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    return super.findOne(id, res);
  }

  @Auth(Role.ADMIN, Role.OPERATOR)
  @Post()
  async create(@Body() createDto: any, @Res() res: Response) {
    return super.create(createDto, res);
  }

  @Auth(Role.ADMIN, Role.OPERATOR)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: any,
    @Res() res: Response,
  ) {
    return super.update(id, updateDto, res);
  }

  @Auth(Role.ADMIN, Role.OPERATOR)
  @Delete(':id')
  async remove(@Param('id') id: string, @Res() res: Response) {
    return super.remove(id, res);
  }
}
