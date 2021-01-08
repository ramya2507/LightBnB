const properties = require('./json/properties.json');
const users = require('./json/users.json');
//Connection to database
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool.query(`SELECT id, name, email, password
  FROM users
  WHERE LOWER(email) = $1`, [ email.toLowerCase() ])
  .then(res => res.rows[0])
  .catch(err => console.log(err))
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  return pool.query(`SELECT id, name, email, password
  FROM users
  WHERE id = $1`, [ id ])
  .then(res => res.rows[0])
  .catch(err => console.log(err))
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name, password, email}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  return pool.query(`INSERT INTO users (name, email, password)
  VALUES($1, $2, $3) RETURNING *;`, [user.name, user.email, user.password])
  .then(res => res.rows[0])
  .catch(err => console.log(err));
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool.query(`SELECT properties.*, reservations.start_date, reservations.end_date, avg(property_reviews.rating) as average_rating
  FROM reservations
  JOIN properties ON properties.id = reservations.property_id
  JOIN property_reviews ON properties.id = property_reviews.property_id 
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.start_date, reservations.end_date
  ORDER BY reservations.start_date LIMIT $2;`, [guest_id, limit])
  .then(res => res.rows)
  .catch(err => console.log(err));
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {
  const queryParams = [];
  let queryString = `SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id  `;
  //if city is entered in search
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }
  //if owner_id is entered in search
  if(options.owner_id){
    queryParams.push(options.owner_id);
    if(options.city){
      queryString += `AND onwer_id = $${queryParams.length}`;
    } else {
      queryString += `WHERE owner_id = $${queryParams.length} `;
    }
  }
  //if minimum_price_per_night and maximum_price_per_night is passed
  if(options.minimum_price_per_night){
    queryParams.push(options.minimum_price_per_night);
    if(options.city){
      queryString += ` AND cost_per_night > $${queryParams.length} `;
    } else {
      queryString += ` WHERE cost_per_night > $${queryParams.length} `;
    }
  }
  if(options.maximum_price_per_night){
    queryParams.push(options.maximum_price_per_night);
    if(options.city || options.minimum_price_per_night){
      queryString += ` AND cost_per_night < $${queryParams.length} `;
    } else {
      queryString += ` WHERE cost_per_night < $${queryParams.length} `;
    }
  }
  //if minimum rating is passed
  if(options.minimum_rating){
    queryParams.push(options.minimum_rating);
    queryString += ` GROUP BY properties.id
      HAVING avg(property_reviews.rating) >= $${queryParams.length}
      ORDER BY cost_per_night 
      LIMIT $${queryParams.length}; `;
  }else {
    queryParams.push(limit);
    queryString += `GROUP BY properties.id
    ORDER BY cost_per_night 
    LIMIT $${queryParams.length};`;
  }
  return pool.query(queryString, queryParams)
  .then(res => res.rows);

}
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  return pool.query(`INSERT INTO properties ( owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
  VALUES($1, $2, $3, $4, $5, $6,$7, $8, $9, $10, $11, $12, $13, $14) RETURNING *;`,[property.owner_id, property.title, property.description, property.thumbnail_photo_url, property.cover_photo_url, property.cost_per_night, property.street, property.city, property.province, property.post_code, property.country, property.parking_spaces, property.number_of_bathrooms, property.number_of_bedrooms])
  .then(res =>  res.rows )
  .catch(err => console.log(err));

}
exports.addProperty = addProperty;
