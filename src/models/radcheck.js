'use strict';

export default function(sequelize, DataTypes) {
  const radcheck = sequelize.define('radcheck', {
    id: {
      type: new DataTypes.INTEGER(),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: new DataTypes.STRING(),
      allowNull: false
    },
    attribute: {
      type: new DataTypes.STRING(),
      allowNull: false
    },
    op: {
      type: new DataTypes.CHAR(2),
      allowNull: false
    },
    value: {
      type: new DataTypes.STRING(),
      allowNull: false
    }
  }, {
    freezeTableName: true,
    tableName: 'radcheck',
    createdAt: false,
    updatedAt: false,
    deletedAt: false
  });

  return radcheck;
}
