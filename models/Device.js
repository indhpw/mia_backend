'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Device extends Model {
        static associate(models) {
            Device.hasMany(models.MenstruationRecord, {
                foreignKey: 'device_id',
                as: 'menstruationRecords'
            });
            Device.hasMany(models.FastingDebt, {
                foreignKey: 'device_id',
                as: 'fastingDebts'
            });
        }
    }

    Device.init({
        device_id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true
        },
            fcm_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'Device',
        tableName: 'devices',
        timestamps: false
    });

    return Device;
};