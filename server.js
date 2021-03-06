import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

import sqlite3 from "sqlite3";
import { open } from "sqlite";

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);

// 👇️ "/home/john/Desktop/javascript"
const __dirname = path.dirname(__filename);
console.log("directory-name 👉️", __dirname);

const app = express();
const port = process.env.PORT || 3002;

const dbPromise = open({
  filename: "main.db",
  driver: sqlite3.Database,
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

console.log(__dirname);

app.use(express.static(path.join(__dirname, "/client/build")));

// Gets the flights whose plane name match the search query
app.post("/api/get_flights", async (req, res) => {
  const searchDestination = req.body.inputDestination;
  const searchDate = req.body.inputDate;

  console.log(searchDestination);
  console.log(searchDate);

  const db = await dbPromise;

  if (searchDestination === "all" && searchDate === "all") {
    const departures_by_search = await db.all(`SELECT * FROM departures`);
    res.send(departures_by_search);
  }

  if (searchDate != "-undefined-undefined" && searchDestination != "default") {
    const departures_by_search = await db.all(
      `SELECT * FROM departures WHERE DATE(departure_date)='${searchDate}' AND destination='${searchDestination}'`
    );
    res.send(departures_by_search);
  } else if (
    searchDate != "-undefined-undefined" &&
    searchDestination == "default"
  ) {
    const departures_by_search = await db.all(
      `SELECT * FROM departures WHERE DATE(departure_date)='${searchDate}'`
    );
    res.send(departures_by_search);
  } else if (
    searchDate == "-undefined-undefined" &&
    searchDestination != "default"
  ) {
    const departures_by_search = await db.all(
      `SELECT * FROM departures WHERE destination='${searchDestination}'`
    );
    res.send(departures_by_search);
  } else {
    const departures_by_search = await db.all(`SELECT * FROM departures`);
    res.send(departures_by_search);
  }
});

// Posts the login data from the form. No data is returned if the data doesn't match
app.post("/api/account/login", async (req, res) => {
  const loginFormEmail = req.body.userLoginInfo.email;
  const loginFormPassword = req.body.userLoginInfo.password;

  const db = await dbPromise;
  const user_login_query = await db.all(
    `SELECT * FROM users WHERE email='${loginFormEmail}' AND password='${loginFormPassword}'`
  );

  res.send(user_login_query);
});

app.post("/api/account/create", async (req, res) => {
  const email = req.body.createUserInfo.createUserEmail;
  const password = req.body.createUserInfo.createUserPassword;
  const first_name = req.body.createUserInfo.createUserFirstName;
  const last_name = req.body.createUserInfo.createUserLastName;
  const user_name = req.body.createUserInfo.createUserUserName;
  const user_id = req.body.createUserInfo.createUserUserID;

  const db = await dbPromise;
  const sql =
    "INSERT INTO users(first_name, last_name, user_name, password, email, customer_id) VALUES (?, ?, ?, ?, ?, ?)";

  if (email && password && first_name && last_name && user_id) {
    await db.run(
      sql,
      [first_name, last_name, user_name, password, email, user_id],
      (err) => {
        if (err) return console.error(err.message);
        console.log("Created a new user.");
      }
    );
  } else {
    console.log("Error: Missing data");
  }

  console.log("adding user");

  res.send({ express: `Created new account with the ID: ${user_id}` });
});

// Code for booking a flight
app.post("/api/book_flight", async (req, res) => {
  const flightID = req.body.flightID;
  const bookingID = req.body.bookingID;
  const customerID = req.body.userData.customerID;

  const db = await dbPromise;

  const sql =
    "INSERT INTO user_flights(flight_id, customer_id, booking_id) VALUES (?, ?, ?)";

  if (flightID && customerID && bookingID) {
    await db.run(sql, [flightID, customerID, bookingID], (err) => {
      if (err) return console.error(err.message);
      console.log("Inserted a row into the departures table.");
    });
  } else {
    console.log("Error: Missing flightID, customerID, bookingID");
  }

  const responseText = { express: `Booked flight number: ${flightID}` };
  res.send(responseText);
});

// Code for cancelling a flight
app.post("/api/cancel_booking/:flight_id", async (req, res) => {
  const db = await dbPromise;

  var flightID = req.params.flight_id;
  const bookingID = req.body.bookingID;

  await db.run(
    // SQL query which deletes all rows in the table where the flight number matches the flightID and the customer ID matches the customerID
    `DELETE FROM user_flights WHERE booking_id=${bookingID}`,
    //`DELETE FROM user_flights WHERE customer_id=${customerID}`,
    (err) => {
      if (err) return console.error(err.message);
      console.log("Deleted a row from the user_flights table.");
    }
  );

  //await db.run(`DELETE FROM user_flights(${flightID}, ${customerID});`);

  const responseText = { express: `Booked flight number: ${flightID}` };
  res.send(responseText);
});

// Gets the data for this page. Called in componentDidMount. Gets user data, and flights associated with the user via the user_flights junction table
app.post("/api/get_user_flight_data/:customer_id", async (req, res) => {
  // Param ID from HTTP request
  const customer_id = req.params.customer_id;
  console.log(customer_id);
  const db = await dbPromise;

  const departures_by_plane_name = await db.all(
    //`SELECT * FROM user_flights JOIN users ON (users.id = ${customer_id}) JOIN departures ON (user_flights.flight_id = departures.flight_id)`
    `SELECT * FROM user_flights JOIN departures ON (user_flights.flight_id = departures.flight_id) WHERE user_flights.customer_id='${customer_id}'`
  );
  // const just_user_data = await db.all(
  //   `SELECT * FROM users WHERE id=${customer_id}`
  // );

  // if (departures_by_plane_name.length > 0) {
  //   res.send(departures_by_plane_name);
  // } else {
  //   res.send(just_user_data);
  // }
  //console.log(departures_by_plane_name);

  console.log(departures_by_plane_name);
  res.send(departures_by_plane_name);
});

// Gets just the user data, used on the account edit page
app.post("/api/get_user_data/:customer_id", async (req, res) => {
  // Param ID from HTTP request
  let customer_id = req.params.customer_id;

  const db = await dbPromise;
  const only_user_data = await db.all(
    `SELECT * FROM users WHERE customer_id=${customer_id}`
  );
  res.send(only_user_data);
});

// Allows the user to edit their account information
app.post("/api/edit_user_data/:customer_id", async (req, res) => {
  // Param ID from HTTP request
  let customer_id = req.params.customer_id;
  const user_email = req.body.userData.email;
  const user_first_name = req.body.userData.first_name;
  const user_last_name = req.body.userData.last_name;
  const user_password = req.body.userData.password;

  const db = await dbPromise;
  await db.all(
    `UPDATE users SET first_name='${user_first_name}', last_name='${user_last_name}', email='${user_email}', password='${user_password}'  WHERE customer_id=${customer_id}`
  );

  res.send({ express: "Finished setting data" });
});

// Gets all the flights in the DB
app.get("/api/get_flights/all", async (req, res) => {
  const db = await dbPromise;
  const all_departure_data = await db.all(`SELECT * FROM departures`);
  res.send(all_departure_data);
});

// Gets the flight information for a single flight
// We need to check if the user has already booked this flight, and if so, block the book form from submitting
app.post("/api/get_flight/:id", async (req, res) => {
  // Param ID from HTTP request
  const idFlightParam = req.params.id;
  const customerID = req.body.customerID;

  const db = await dbPromise;
  // Query containing flight info and user info. Used to determine whether the user has already booked the flight
  const flight_info_by_id = await db.all(
    `SELECT * FROM user_flights JOIN users ON (users.customer_id = ${customerID}) JOIN departures ON (user_flights.flight_id = departures.flight_id) WHERE user_flights.flight_id='${idFlightParam}'`
    //`SELECT departures.flight_id, departures.departure_time, departures.departure_date, departures.destination, departures.plane_name, users.id, users.first_name, users.last_name, users.user_name, users.email FROM departures JOIN user_flights ON (user_flights.flight_id = departures.flight_id) JOIN users ON (users.id = user_flights.customer_id) WHERE departures.flight_id=${idParam}`
  );

  // Query just containing flight info
  const flight_info_by_id_simple = await db.all(
    `SELECT * FROM departures WHERE departures.flight_id=${idFlightParam}`
  );

  if (flight_info_by_id.length == 0) {
    res.send(flight_info_by_id_simple);
  } else {
    res.send(flight_info_by_id);
  }
});

// Admin API stuff
app.post("/api/admin/edit_flight/:flight_id", async (req, res) => {
  // NEEDS WORK
  // Param ID from HTTP request
  const idFlightParam = req.params.flight_id;
  const newFlightPlaneName = req.body.newFlightPlaneName;
  const newFlightTime = req.body.newFlightTime;
  const newFlightDepartureDate = req.body.newFlightDepartureDate;
  const newFlightDestination = req.body.newFlightDestination;
  const newFlightPrice = req.body.newFlightPrice;
  const newFlightNumberSeats = req.body.newFlightNumberSeats;
  const newFlightOrigin = req.body.newFlightOrigin; // TODO

  const db = await dbPromise;

  db.run(
    `UPDATE departures SET plane_name='${newFlightPlaneName}', departure_date='${newFlightDepartureDate}', destination='${newFlightDestination}', origin='${newFlightOrigin}', departure_time='${newFlightTime}', cost='${newFlightPrice}', seats='${newFlightNumberSeats}'  WHERE flight_id=${idFlightParam}`,
    (err) => {
      if (err) return console.error(err.message);

      console.log("Updated a row into the departures table.");
    }
  );

  res.send({ express: "Successfully updated the flight!" });
});

app.post("/api/admin/delete_flight/:flight_id", async (req, res) => {
  // Param ID from HTTP request
  const idFlightParam = req.params.flight_id;

  const db = await dbPromise;

  db.run(`DELETE FROM departures WHERE flight_id=${idFlightParam}`, (err) => {
    if (err) return console.error(err.message);

    console.log("Removed a row from the departures table.");
  });

  res.send({ express: `Successfully deleted flight ${idFlightParam}` });
});

app.post("/api/admin/add_flight", async (req, res) => {
  // Param ID from HTTP request
  const newFlightID = req.body.newFlightID;
  const newFlightPlaneName = req.body.newFlightPlaneName;
  const newFlightTime = req.body.newFlightTime;
  const newFlightDepartureDate = req.body.newFlightDepartureDate;
  const newFlightDestination = req.body.newFlightDestination;
  const newFlightPrice = req.body.newFlightPrice;
  const newFlightNumberSeats = req.body.newFlightNumberSeats;
  const newFlightOrigin = req.body.newFlightOrigin;

  const db = await dbPromise;

  const check_for_duplicate_flight = await db.all(
    `SELECT * FROM departures WHERE flight_id=${newFlightID}`
  );

  if (check_for_duplicate_flight.length > 0) {
    res.send({ express: "Flight already exists", error: true });
  }

  const sql =
    "INSERT INTO departures(flight_id, plane_name, departure_date, destination, origin, departure_time, cost, seats) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";

  if (
    newFlightID &&
    newFlightPlaneName &&
    newFlightDepartureDate &&
    newFlightDestination &&
    newFlightOrigin &&
    newFlightTime &&
    newFlightPrice &&
    newFlightNumberSeats
  ) {
    await db.run(
      sql,
      [
        newFlightID,
        newFlightPlaneName,
        newFlightDepartureDate,
        newFlightDestination,
        newFlightOrigin,
        newFlightTime,
        newFlightPrice,
        newFlightNumberSeats,
      ],
      (err) => {
        if (err) return console.error(err.message);
        console.log("Inserted a row into the departures table.");
      }
    );
  } else {
    console.log("Error: Missing data");
  }

  res.send({ express: "Successfully added a new flight!", error: false });
});

// Setup the db and start the server
const setup = async () => {
  const db = await dbPromise;
  app.listen(port, () => console.log(`Listening on port ${port}`));
};

setup();
