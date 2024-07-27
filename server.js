const express = require('express');
const app = express();
require('dotenv').config();
const mongoose = require('mongoose');
const cron = require('node-cron');

app.get('/', (req, res) => {
  res.send('working over here');
});

async function connectDb() {
  try {
    await mongoose.connect(
      process.env.NODE_ENV === 'development'
        ? process.env.MONGODB_DEV_URI
        : process.env.MONGODB_PROD_URI
    );
    console.log('connected');
  } catch (err) {
    console.log(err);
  }
}

async function deleteEmailConfirmToken() {
  await connectDb();
  const users = mongoose.connection.db.collection('users');
  await users.updateMany(
    { emailConfirmTokenExpire: { $lt: new Date() } },
    { $unset: { emailConfirmTokenExpire: '', emailConfirmToken: '' } }
  );
}

async function deletePasswordResetToken() {
  await connectDb();
  const users = mongoose.connection.db.collection('users');
  await users.updateMany(
    { resetPasswordTokenExpire: { $lt: new Date() } },
    { $unset: { resetPasswordTokenExpire: '', resetPasswordToken: '' } }
  );
}

async function deleteExpiredBookedRooms() {
  await connectDb();
  const users = mongoose.connection.db.collection('users');
  const rooms = mongoose.connection.db.collection('rooms');
  await rooms.updateMany(
    { checkOutDate: { $gt: new Date() } },
    { $unset: { checkOutDate: '', bookedBy: '', booked: false } }
  );

  await users.updateMany(
    {},
    {
      $pull: {
        bookedRooms: { 'bookedDate.checkOutDate': { $gt: new Date() } },
      },
    }
  );
}

cron.schedule('0 0 * * sunday', async () => {
  try {
    await deleteEmailConfirmToken();
    await deletePasswordResetToken();
  } catch (err) {
    console.log(err);
  }
});

cron.schedule('0 */12 * * *', async () => {
  try {
    await deleteExpiredBookedRooms();
    console.log('booked rooms deleted');
  } catch (err) {
    console.log(err);
  }
});

app.listen(3000, () => {
  console.log('working over here');
});
