import { useState } from "react";

export default function Shopify({ setShopifyArray, setLoadingMessage }) {
  const [ordersDate, setOrdersDate] = useState("");
  const [APIData, setAPIData] = useState([]);

  // filter argument array of objects by input date
  function getOnlyTargetDayObjects(array) {
    // first two characters of input date XX-XX
    let ordersMonth = ordersDate.slice(0, 2);
    // last two characters of input date XX-XX
    const ordersDay = ordersDate.slice(-2);
    if (ordersMonth.charAt(0) === "0") ordersMonth = ordersMonth.charAt(1);
    const searchDate = `${ordersMonth}/${ordersDay}`;

    // filter argument array of order objects so that we only get orders
    // with items that contain our searchDate
    const objectsWeWant = array.filter((order) =>
      order.node.lineItems.nodes.some((item) =>
        item.name.includes(`${searchDate}`)
      )
    );

    return objectsWeWant;
  }

  // takes in an array of customer objects, returns the same objects with some different keys & values
  function modifyCustomers(array) {
    setLoadingMessage("modifying order objects");

    let inputCustomers = array;
    let modifiedCustomers = [];

    // do this for every customer in the array
    for (let i = 0; i < inputCustomers.length; i++) {
      let customer = inputCustomers[i].node;

      // finds all key / value pairs in the lineItems node of the order
      let customerItems = customer.lineItems.nodes;

      let itemsCatch = [];
      let dayCatch = [];

      // for each lineItem node
      for (const entry in customerItems) {
        // formatting each item back to "1 Pepperoni - Wednesday 11/15 (Seattle, mostly north of the ship canal)"
        const correctFormat = `${customerItems[entry].quantity} ${customerItems[entry].name}`;

        const lastIndexOfDash = correctFormat.lastIndexOf(" - ");
        // just the first part of the customerItem string
        // "1 Pepperoni - Wednesday, 11/15 (Seattle, mostly north of the ship canal)" becomes
        // "1 Pepperoni"
        let item = correctFormat.split(" - ")[0];
        // and "Wednesday, 11/15 (Seattle, mostly north of the ship canal)"
        let dayOfWeek = correctFormat.slice(lastIndexOfDash + 3);

        // this is a catch for the cookies
        // removing "Really Good"
        if (correctFormat.includes("Really Good")) {
          item = `${correctFormat.slice(0, 1)} ${correctFormat.slice(14)}`;
        }

        // removing unnecessary extra info
        const parenth = item.indexOf("(");
        if (parenth < item.indexOf("-")) {
          item = item.slice(0, parenth - 1);
        }

        // turns any number of 'Lineitem" k / v pairs into one k / v pair with a key called 'Notes' and an array of items
        if (item === "1 Tip") continue;
        // this item doesn't have a day of the week
        else if (item === "1 Thermal Bag") {
          itemsCatch.push(item);
        } else {
          itemsCatch.push(item);
          // "Wednesday, 11/15 (Seattle, mostly north of the ship canal)" becomes "Wednesday" and is added to the dayCatch array
          if (dayOfWeek) dayCatch.push(dayOfWeek.split(",")[0]);
        }
      }

      // adding key/value pairs in the format that Circuit wants
      customer["Notes"] = itemsCatch.join(", ");
      customer["Day of Week"] = dayCatch;
      customer["Seller Order ID"] = customer["name"];
      customer["Name"] = customer.customer.defaultAddress.name;
      customer["Phone Number"] = customer.customer.defaultAddress.phone;
      customer["Address 1"] = customer.customer.defaultAddress.address1;
      customer["Address 2"] = customer.customer.defaultAddress.address2;
      customer["Zip"] = customer.customer.defaultAddress.zip;
      customer["City"] = customer.customer.defaultAddress.city;
      customer["Email"] = customer["email"];
      customer["State"] = customer.customer.defaultAddress.provinceCode;

      let earliestTime, latestTime;

      if (customer.customAttributes.length === 3) {
        earliestTime = customer.customAttributes.filter((item) =>
          item.key.includes("The earliest")
        )[0].value;
        latestTime = customer.customAttributes.filter((item) =>
          item.key.includes("The latest")
        )[0].value;
      }

      customer["Earliest Time"] = earliestTime;
      customer["Latest Time"] = latestTime;

      delete customer["createdAt"];
      delete customer["customAttributes"];
      delete customer["customer"];
      delete customer["displayFulfillmentStatus"];
      delete customer["email"];
      delete customer["lineItems"];
      delete customer["name"];
      delete customer["note"];

      // if all of the days in the dayCatch array are not the same, customer probably selected multiple days
      // and you should know about that to reach out to them and see what's up
      if (!dayCatch.every((val) => val === dayCatch[0])) {
        customer["ERROR"] = "multiple days";
      }
      // if all of the days are the same:
      else customer["Day of Week"] = dayCatch[0];

      modifiedCustomers.push(customer);
    }

    return modifiedCustomers;
  }

  async function processShopifyCSVForCircuit(results) {
    // console.log("doing main function");
    setLoadingMessage("filtering data for target date");
    const targetDayOrders = getOnlyTargetDayObjects(results); // filter argument array of objects by input date
    const modifiedCustomers = modifyCustomers(targetDayOrders); // filtering again to get rid of those "Lineitem #" k / v pairs that we don't need anymore
    setShopifyArray(modifiedCustomers)
    return modifiedCustomers;
  }

  function doAPIRequest(e) {
    e.preventDefault();
    setLoadingMessage("getting data from Shopify API");
    // get data from Shopify API
    fetch(`https://glb-function-delta.vercel.app/api/hello?date=${ordersDate}`)
      .then((resp) => resp.json())
      .then((data) => {
        setAPIData(data.orders.edges);
        processShopifyCSVForCircuit(data.orders.edges);
      });
  }

  return (
    <section>
      <label>Enter the date of your orders in this format: (MM-DD)</label>
      <input
        type="text"
        value={ordersDate}
        onChange={(e) => setOrdersDate(e.target.value)}
        placeholder="MM-DD"
      ></input>
      <button onClick={(e) => doAPIRequest(e)}>Get Shopify data</button>
    </section>
  );
}
