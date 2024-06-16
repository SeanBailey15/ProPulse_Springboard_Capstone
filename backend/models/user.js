"use strict";

const db = require("../db");
const bcrypt = require("bcrypt");

const {
  NotFoundError,
  BadRequestError,
  UnauthorizedError,
} = require("../expressError");

const { sqlForPartialUpdate } = require("../helpers/sql");

const { BCRYPT_WORK_FACTOR } = require("../config.js");

/** Related functions for users. */

class User {
  /** authenticate user with email, password.
   *
   * Returns { id, email, firstName, lastName, phone, organization, title, profileImg }
   *
   * Throws UnauthorizedError is user not found or wrong password.
   **/

  static async authenticate(email, password) {
    // try to find the user first
    const result = await db.query(
      `SELECT id, 
              email,
              password,
              first_name AS "firstName",
              last_name AS "lastName",
              phone,
              organization,
              title,
              profile_img AS "profileImg"
           FROM users
           WHERE email = $1`,
      [email]
    );

    const user = result.rows[0];

    if (user) {
      // compare hashed password to a new hash from password
      const isValid = await bcrypt.compare(password, user.password);
      if (isValid === true) {
        delete user.password;
        return user;
      }
    }

    throw new UnauthorizedError("Invalid email/password");
  }

  /** Register user with data.
   *
   * Returns { id, email, firstName, lastName, phone, organization, title }
   *
   * Throws BadRequestError on duplicates.
   **/

  static async register({
    email,
    password,
    firstName,
    lastName,
    phone,
    organization,
    title,
  }) {
    const duplicateCheck = await db.query(
      `SELECT email
           FROM users
           WHERE email = $1`,
      [email]
    );

    if (duplicateCheck.rows[0]) {
      throw new BadRequestError(`Duplicate email: ${email} already exists`);
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    const result = await db.query(
      `INSERT INTO users
           (email,
            password,
            first_name,
            last_name,
            phone,
            organization,
            title)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, email, first_name AS "firstName", last_name AS "lastName", phone, organization, title, profile_img AS "profileImg"`,
      [email, hashedPassword, firstName, lastName, phone, organization, title]
    );

    const user = result.rows[0];

    return user;
  }

  /** Given a user id, return data about user and their jobs.
   *
   * Returns { id, email, firstName, lastName, phone, organization, title, active, subscriptons, jobs }
   *   where jobs is [{ id, name, city, state, streetAddr, adminId, adminEmail }, ...]
   *   or jobs property not listed when no jobs are found
   *
   * Throws NotFoundError if user not found or user deactivated.
   **/

  static async get(userId) {
    const userRes = await db.query(
      `SELECT id, 
              email,
              first_name AS "firstName",
              last_name AS "lastName",
              phone,
              organization,
              title,
              profile_img AS "profileImg",
              active,
              subscriptions
           FROM users
           WHERE id = $1`,
      [userId]
    );
    const user = userRes.rows[0];

    if (!user || !user.active)
      throw new NotFoundError(`No user with id: ${userId}`);

    const id = userRes.rows[0].id;
    const userJobsRes = await db.query(
      `SELECT jobs.id,
              jobs.name,
              jobs.city,
              jobs.state,
              jobs.street_addr AS "streetAddr",
              jobs.admin AS "adminId",
              users.email AS "adminEmail"
           FROM jobs
           JOIN job_associations AS ja
           ON jobs.id = ja.job_id
           JOIN users
           ON jobs.admin = users.id
           WHERE ja.user_id = $1`,
      [id]
    );

    if (userJobsRes.rows[0]) user.jobs = userJobsRes.rows.map((ja) => ja);

    return user;
  }

  /** Get a user by their email
   *
   * Used with site and job invites only
   *  only id data required for these actions
   *
   * Returns { id, email, firstName, lastName, phone, organization, title, profileImg, active, subscription }
   *
   * Throws NotFound if user not found or is deactivated
   */

  static async getByEmail(userEmail) {
    const userRes = await db.query(
      `SELECT id, 
              email,
              first_name AS "firstName",
              last_name AS "lastName",
              phone,
              organization,
              title,
              profile_img AS "profileImg",
              active,
              subscriptions
           FROM users
           WHERE email = $1`,
      [userEmail]
    );

    const user = userRes.rows[0];

    if (!user || !user.active)
      throw new NotFoundError(`No user with email: ${userEmail}`);

    return user;
  }

  /** Get all users from database
   *
   * Not necessary to this point, may find a use later
   *
   * Returns all users:
   *  [{ id, email, firstName, lastName, phone, organization, title, profileImg, active, subscriptions }, ...]
   */

  static async getAll() {
    const userRes = await db.query(
      `SELECT id,
              email,
              first_name AS "firstName",
              last_name AS "lastName",
              phone,
              organization,
              title,
              profile_img AS "profileImg",
              active,
              subscriptions
        FROM users`
    );

    const users = userRes.rows;

    return users;
  }

  /** Update user data with provided data
   *
   * This is a partial update, not all user properties are required in the data
   *
   * Data can include:
   *  { email, firstName, lastName, phone, organization, title, profileImg }
   *
   * Returns { email, firstName, lastName, phone, organization, title, profileImg, active, subscriptions }
   *
   * Throws NotFoundError if not found.
   */

  static async update(userId, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {
      firstName: "first_name",
      lastName: "last_name",
      profileImg: "profile_img",
    });

    const userIdVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE users
                      SET ${setCols}
                      WHERE id = ${userIdVarIdx}
                      RETURNING email,
                                first_name AS "firstName",
                                last_name AS "lastName",
                                phone,
                                organization,
                                title,
                                profile_img AS "profileImg",
                                active,
                                subscriptions`;

    const result = await db.query(querySql, [...values, userId]);
    const user = result.rows[0];

    if (!user) throw new NotFoundError(`User Does Not Exist: id ${userId}`);

    return user;
  }

  /** Deactivates a given user in the database.
   *
   * Toggles user.active to false, simulating deletion
   *  and allowing for account recovery if they change their mind.
   *
   * Returns a message.
   */

  static async deactivate(userId) {
    const userCheck = await db.query(`SELECT * FROM users WHERE id = $1`, [
      userId,
    ]);

    const user = userCheck.rows[0];

    if (!user) throw new NotFoundError("User does not exist in database");

    await db.query(
      `UPDATE users
        SET active = false
        WHERE id = $1`,
      [userId]
    );

    return "User deactivated";
  }

  /** Updates user notification subscriptions
   *
   * Takes subscription object and user id
   *
   * Inserts subscription object into user subscriptions array
   */

  static async addSubscription(subscription, userId) {
    const subCheck = await db.query(
      `SELECT subscriptions
        FROM users
        WHERE id = $1`,
      [userId]
    );
    const { subscriptions } = subCheck.rows[0];

    if (subscriptions) {
      const existingSubscription = subscriptions.find(
        (sub) => sub.endpoint === subscription.endpoint
      );

      if (existingSubscription) {
        throw new Error("Subscription already exists");
      }
    }

    const subRes = await db.query(
      `UPDATE users
          SET subscriptions = array_append(subscriptions, $1)
          WHERE id = $2
          RETURNING subscriptions`,
      [subscription, userId]
    );

    const userSubs = subRes.rows[0];

    return userSubs;
  }
}

module.exports = User;
