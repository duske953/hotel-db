const express = require('express');
const app = express();
require('dotenv').config();
const mongoose = require('mongoose');

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
  const users = mongoose.connection.db.collection('users');
  const rooms = mongoose.connection.db.collection('rooms');
  await rooms.updateMany(
    { checkOutDate: { $lt: new Date() } },
    { $unset: { checkOutDate: '', bookedBy: '', booked: false } }
  );

  await users.updateMany(
    {},
    {
      $pull: {
        bookedRooms: { 'bookedDate.checkOutDate': { $lt: new Date() } },
      },
    }
  );
}

app.get('/delete-token', async (req, res) => {
  await connectDb();
  await deleteEmailConfirmToken();
  await deletePasswordResetToken();
  res.send('okay');
});

app.get('/delete-rooms', async (req, res) => {
  await connectDb();
  await deleteExpiredBookedRooms();
  res.send('okay');
});

app.listen(3000, () => {
  console.log('working over here');
});
