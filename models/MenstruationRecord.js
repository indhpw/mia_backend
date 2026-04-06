'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class MenstruationRecord extends Model {
        static associate(models) {
            MenstruationRecord.belongsTo(models.Device, {
                foreignKey: 'device_id',
                as: 'device'
            });
            MenstruationRecord.hasMany(models.FastingDebt, {
                foreignKey: 'record_id',
                as: 'debts'
            });
        }
    }

    MenstruationRecord.init({
        record_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        device_id: {
            type: DataTypes.BIGINT,
            allowNull: false,
          
        },
        device_record_number: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: false
        },
        end_date: {
            type: DataTypes.DATEONLY,
            allowNull: true
        },
        hijri_start_date: {
            type: DataTypes.STRING,
            allowNull: false
        },
        hijri_end_date: {
            type: DataTypes.STRING,
            allowNull: false
        },
        is_ramadan: {
            type: DataTypes.BOOLEAN,
            allowNull: false
        },
        cycle_length: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        period_length: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'MenstruationRecord',
        tableName: 'menstruation_records',
        timestamps: false
    });

    return MenstruationRecord;
};