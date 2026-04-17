'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class FastingDebt extends Model {
        static associate(models) {
            FastingDebt.belongsTo(models.MenstruationRecord, {
                foreignKey: 'record_id',
                as: 'menstruationRecord'
            });
            FastingDebt.hasMany(models.FastingPayment, {
                foreignKey: 'debt_id',
                as: 'payments'
            });
            FastingDebt.belongsTo(models.Device, {
                foreignKey: 'device_id',
                as: 'device'
            });
        }
    }

    FastingDebt.init({
        debt_id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
        },
        device_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
            references: {
                model: 'devices',
                key: 'device_id'
            }
        },
        record_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            defaultValue: null,
            references: {
                model: 'menstruation_records',
                key: 'record_id'
            },
            onDelete : 'SET NULL',
            onUpdate: 'CASCADE'
        },
        missed_days: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        status: {
            type: DataTypes.ENUM('lunas', 'belum_lunas', 'tidak_berlaku'),
            allowNull: false,
            defaultValue: 'belum_lunas'
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'FastingDebt',
        tableName: 'fasting_debts',
        timestamps: false
    });

    return FastingDebt;
};