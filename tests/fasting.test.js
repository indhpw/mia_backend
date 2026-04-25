const request = require('supertest');
const app = require('../app');
const sequelize = require('../config/database');

describe('Fasting API', () => {

    it('GET fasting debts by device_id', async () => {

        const response = await request(app)
        .get('/api/fasting/debts/device/30');

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
    });
});

describe('POST /debts/:debt_id/pay', () => {
    
    it('should create payment successfully', async () => {
        const res = await request(app)
            .post('/api/fasting/debts/30/pay')
            .send({
                payment_date: '2026-03-25',
                amount: 1
            });

            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('payment');
            expect(res.body.payment).toHaveProperty('payment_date');
            expect(res.body.payment.payment_date).toBe('2026-03-25');
            });

it('should fail if invalid date', async () => {
    const res = await request(app)
      .post('/api/fasting/debts/30/pay')
      .send({
        payment_date: 'invalid-date',
        amount: 1
      });

    expect(res.statusCode).toBe(400);
  });    
});

afterAll(async () => {
  await sequelize.close();
});
