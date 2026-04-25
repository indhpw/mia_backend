jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn()
  },
  messaging: () => ({
    send: jest.fn().mockResolvedValue('success'),
    sendEachForMulticast: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: []
    })
  })
}));

const { sendAyyamulBidhReminder } = require('../services/notificationService');

describe('Notification', () => {

  it('should send notification ayyamul bidh', async () => {

    const result = await sendAyyamulBidhReminder('dummy_token', true);

    expect(result.success).toBe(true);
  });

});