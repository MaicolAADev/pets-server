import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DataSource } from 'typeorm';

describe('AdoptionCenters (e2e)', () => {
  let app: INestApplication;
  let token: string;
  let createdId: number;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    dataSource = moduleFixture.get<DataSource>(DataSource);
    app = moduleFixture.createNestApplication();
    await app.init();

    await dataSource.query(`
      INSERT INTO "user" 
      (id, "fullName", email, "password", "role", "createdAt", address, phone, "isActive") 
      VALUES 
      (1, 'Maicol A', 'cutrepez200@gmail.com', '$2a$10$7lsLPB0EKDNS7MTyj0e6E.6lHTJFRenm5U/1vCGHT8SL3J.T6aoSK', 'admin', '2025-05-14 14:04:44.250', 'Carrera', '3019892002', true)
      ON CONFLICT (id) DO NOTHING;
    `);


    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'cutrepez200@gmail.com',
        password: 'Ma1234',
      });

    token = loginResponse.body?.body?.token;

    if (!token) {
      throw new Error('No se pudo obtener el token de autenticación');
    }

    const createResponse = await request(app.getHttpServer())
      .post('/adoption-centers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Adoption Center 1',
        description: 'desc',
        address: 'Laureles - Medellín',
        phone: '312879122',
        email: 'maicol.alvarez@mantum.com.co',
        website: 'http//:github.com/maicolAA',
        facebook: 'maicolaa',
        instagram: 'maicolaa',
        twitter: 'maicol',
        youtube: 'maicolaa',
        whatsapp: '232323'
      });

    createdId = createResponse.body?.body?.id;
    if (!createdId) {
      throw new Error('No se pudo crear un centro de adopción de prueba');
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('/GET /adoption-centers/:id debe retornar el detalle del centro de adopción', async () => {
    const res = await request(app.getHttpServer())
      .get(`/adoption-centers/${createdId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('status', 200);
    expect(res.body).toHaveProperty('message', 'Success');
    expect(res.body).toHaveProperty('body');
    expect(res.body.body).toHaveProperty('id', createdId);
    expect(res.body.body).toHaveProperty('name', 'Adoption Center 1');
  });

  let createdPetTypeId: number;

  it('/POST /pet-types debe crear un tipo de mascota', async () => {
    const res = await request(app.getHttpServer())
      .post('/pet-types')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Perro',
        attributes: [],
      })
      .expect(200);

    expect(res.body).toHaveProperty('status', 200);
    expect(res.body).toHaveProperty('body');
    expect(res.body.body).toHaveProperty('id');
    expect(res.body.body).toHaveProperty('name', 'Perro');

    createdPetTypeId = res.body.body.id;
  });

  it('/GET /pet-types/:id debe retornar el detalle del tipo de mascota', async () => {
    const res = await request(app.getHttpServer())
      .get(`/pet-types/${createdPetTypeId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('status', 200);
    expect(res.body).toHaveProperty('message', 'Success');
    expect(res.body).toHaveProperty('body');
    expect(res.body.body).toHaveProperty('id', createdPetTypeId);
    expect(res.body.body).toHaveProperty('name', 'Perro');
  });

  let createdPetId: number;

  it('/POST /pets debe crear una mascota', async () => {
    const res = await request(app.getHttpServer())
      .post('/pets')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Max',
        description: 'Pastor Alemán juguetón',
        adoptionCenterId: createdId,
        petType: {
          id: createdPetTypeId,
        },
        attributeValues: [],
      })
      .expect(200);

    expect(res.body).toHaveProperty('status', 200);
    expect(res.body).toHaveProperty('body');
    createdPetId = res.body.body.id;
  });

  it('/GET /pets/:id debe retornar el detalle de la mascota', async () => {
    const res = await request(app.getHttpServer())
      .get(`/pets/${createdPetId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toHaveProperty('status', 200);
    expect(res.body).toHaveProperty('message', 'Success');
    expect(res.body).toHaveProperty('body');

    const pet = res.body.body;
    expect(pet).toHaveProperty('id', createdPetId);
    expect(pet).toHaveProperty('name', 'Max');
    expect(pet).toHaveProperty('description', 'Pastor Alemán juguetón');
    expect(pet).toHaveProperty('active', true);

    expect(pet.adoptionCenter).toHaveProperty('id', createdId);
    expect(pet.adoptionCenter).toHaveProperty('name', 'Adoption Center 1');

    expect(pet.petType).toHaveProperty('id', createdPetTypeId);
    expect(pet.petType).toHaveProperty('name', 'Perro');

    expect(pet.attributeValues).toEqual([]);
    expect(pet.files).toEqual([]);
  });

});


