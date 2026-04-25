const request = require('supertest');
const app = require('../app');
const sequelize = require('../config/database');

describe('Validation Testing', () => {

  // FASTING VALIDATION

  describe('Fasting Validation', () => {

    it('should fail if payment_date invalid', async () => {
      const res = await request(app)
        .post('/api/fasting/debts/30/pay')
        .send({
          payment_date: 'tanggal-salah',
          amount: 1
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should fail if amount missing', async () => {
      const res = await request(app)
        .post('/api/fasting/debts/30/pay')
        .send({
          payment_date: '2026-03-25'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('errors');
    });

    it('should fail if request body empty', async () => {
      const res = await request(app)
        .post('/api/fasting/debts/30/pay')
        .send({});

      expect(res.statusCode).toBe(400);
    });

  });

  // MENSTRUATION VALIDATION

  describe('Menstruation Validation', () => {

    it('should fail if start_date missing', async () => {
      const res = await request(app)
        .post('/api/menstruation/records')
        .send({
          end_date: '2026-03-10',
          cycle_length: 28
        });

      expect(res.statusCode).toBe(400);
    });

    it('should fail if invalid date format', async () => {
      const res = await request(app)
        .post('/api/menstruation/records')
        .send({
          start_date: 'abc',
          end_date: 'xyz',
          cycle_length: 28
        });

      expect(res.statusCode).toBe(400);
    });

  });

});

afterAll(async () => {
  await sequelize.close();
});