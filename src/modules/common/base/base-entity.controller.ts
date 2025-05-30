import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  Body,
  Post,
  Put,
  BadRequestException,
  Delete,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { BaseController } from '@modules/common/base/admin.controller';
import { IBaseService } from '@modules/common/interfaces/base-service.interface';
import { PaginationQueryDto } from '@modules/common/dto/pagination/pagination-query.dto';
import { messages } from 'src/messages/messages';

@Controller()
export abstract class BaseEntityController extends BaseController {
  protected abstract service: IBaseService;
  protected resourceName = 'recurso';
  protected entityNotFound: string = messages.entityNotFound;
  protected entityAlreadyExists: string = messages.entityAlreadyExists;
  protected createdMessage: string = messages.entityCreated;
  protected updatedMessage: string = messages.entityUpdated;
  protected deletedMessage: string = messages.entityDeleted;

  @Get()
  async findAll(@Query() query: PaginationQueryDto, @Res() res: Response) {
    try {
      const data = await this.service.findAll(query);
      return this.successResponse(res, messages.success, data);
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    try {
      const data = await this.service.findOne(+id);
      if (data === null) throw new NotFoundException(this.entityNotFound);
      return this.successResponse(res, messages.success, data);
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  @Post()
  async create(@Body() dto: any, @Res() res: Response) {
    try {
      const created = await this.service.create(dto);
      return this.successResponse(res, this.createdMessage, created);
    } catch (error) {
      console.log(error);
      return this.handleError(res, error);
    }
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: any,
    @Res() res: Response,
  ) {
    try {
      const parsedId = parseInt(id, 10);
      if (isNaN(parsedId)) {
        throw new BadRequestException(this.entityNotFound);
      }
      dto.id = parsedId;
      const updated = await this.service.update(id, dto);
      return this.successResponse(res, this.updatedMessage, updated);
    } catch (error) {
      return this.handleError(res, error);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Res() res: Response) {
    try {
      const parsedId = parseInt(id, 10);
      if (isNaN(parsedId)) {
        throw new BadRequestException(this.entityNotFound);
      }

      const result = await this.service.remove(parsedId);
      return this.successResponse(res, this.deletedMessage, result);
    } catch (error) {
      return this.handleError(res, error);
    }
  }
}
