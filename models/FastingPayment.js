'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class FastingPayment extends Model {
        static associate(models) {
            this.belongsTo(models.FastingDebt, {
                foreignKey: 'debt_id',
                as: 'fastingDebt'
            });
        }
    }

    FastingPayment.init({
        payment_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        debt_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'fasting_debts',
                key: 'debt_id'
            }
        },
        device_id: {
             type: DataTypes.BIGINT, 
             allowNull: false 
        },
        payment_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        amount: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'FastingPayment',
        tableName: 'fasting_payments',
        timestamps: false
    });

    return FastingPayment;
};