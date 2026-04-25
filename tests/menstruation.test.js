const request = require('supertest');
const app = require('../app');
const sequelize = require('../config/database');

describe('Menstruation API', () => {

//GET menstruation records by device_id
  describe('GET /api/menstruation/records?:device_id', () => {

    it('should get menstruation records by device id', async () => {

      const res = await request(app)
        .get('/api/menstruation/records?device_id=30');

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

  });

  // CREATE menstruation record
  
  describe('POST /api/menstruation/records', () => {

    it('should create menstruation record successfully', async () => {

      const res = await request(app)
        .post('/api/menstruation/records')
        .send({
          device_id: 30,
          start_date: '2026-03-01',
          end_date: '2026-03-06',
          cycle_length: 28,
          menstruation_length: 7
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('record_id');
      expect(res.body).toHaveProperty('device_id');
      expect(res.body.start_date).toBe('2026-03-01');
    });

    it('should fail if start_date invalid', async () => {

      const res = await request(app)
        .post('/api/menstruation/records')
        .send({
          device_id: 30,
          start_date: 'tanggal-salah',
          end_date: '2026-03-06',
          cycle_length: 28
        });

      expect(res.statusCode).toBe(400);
    });

    it('should fail if required field missing', async () => {

      const res = await request(app)
        .post('/api/menstruation/records')
        .send({
          device_id: 30,
          end_date: '2026-03-05',
          cycle_length: 28
        });

      expect(res.statusCode).toBe(400);
    });

    it('should fail if device_id is missing', async () => {
      const res = await request(app)
        .post('/api/menstruation/records')
        .send({
          start_date: '2026-04-01'
        });

      expect(res.statusCode).toBe(400);
    });

  });

  // PREDICT NEXT CYCLE
  describe('GET /api/menstruation/records?predict=device_id', () => {

    it('should predict next cycle', async () => {

      const res = await request(app)
        .get('/api/menstruation/predict?device_id=30');

      expect(res.statusCode).toBe(200);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('predicted_start_date');

    });

  });

  // UPDATE MENSTRUATION RECORD
  describe('PUT /api/menstruation/records/record_id', () => {

    it('should update menstruation record successfully', async () => {
      const res = await request(app)
        .put('/api/menstruation/records/13')
        .send({
          end_date: '2026-04-26',
          period_length: 8,
          cycle_length: 29
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('record_id');
      expect(res.body).toHaveProperty('end_date');
      expect(res.body.end_date).toBe('2026-04-26');
    });

    it('should fail if record_id not found', async () => {
      const res = await request(app)
        .put('/api/menstruation/records/999999')   
        .send({
          end_date: '2026-04-08'
        });

      expect(res.statusCode).toBe(404);
    });

    it('should fail if end_date is before start_date', async () => {
      const res = await request(app)
        .put('/api/menstruation/records/13')
        .send({
          end_date: '2026-03-01'
        });

      expect(res.statusCode).toBe(400);
    });

  });

});

afterAll(async () => {
  await sequelize.close();
});