import { useState } from "react";
import { useCSVReader, useCSVDownloader } from "react-papaparse";

export default function Shopify({ setShopifyArray, setLoadingMessage, styles }) {
  const [ordersDate, setOrdersDate] = useState("");
  const [APIData, setAPIData] = useState([]);

  const { CSVReader } = useCSVReader();

  // headers from the CSV file that we want in our customer objects
  // removing most of the headers for readability
  const shopifyAllowed = [
    "Name",
    "Email",
    "Earliest Time",
    "Latest Time",
    "Lineitem quantity",
    "Lineitem name",
    "Shipping Name",
    "Shipping Street",
    "Shipping Zip",
    "Shipping Phone",
    "Shipping City",
    "Shipping Province",
    "Seller Order ID",
    "Phone Number",
    "Zip",
    "City",
    "State",
    "Address 1",
    "Address 2",
    "Note Attributes",
    "Notes",
    "Day of Week",
    "ERROR",
  ];

  function filterKeysInObjectsInArrayByKeys(array, allowed) {
    console.log(array);
    return array.map((r) => {
      return Object.keys(r)
        .filter((key) => allowed.includes(key))
        .reduce((obj, key) => {
          return {
            ...obj,
            [key]: r[key],
          };
        }, {});
    });
  }

  function getOnlyTargetDayObjects(array) {
    console.log(array);

    let ordersMonth = ordersDate.slice(0, 2);
    const ordersDay = ordersDate.slice(-2);
    if (ordersMonth.charAt(0) === "0") ordersMonth = ordersMonth.charAt(1);
    const searchDate = `${ordersMonth}/${ordersDay}`;
    console.log(searchDate);

    const objectsWeWant = array.filter((order) =>
      order.node.lineItems.nodes.some((item) =>
        item.name.includes(`${searchDate}`)
      )
    );

    return objectsWeWant;
  }

  // turns an array of customer data from the CSV into an array of customer objects
  // function getShopifyDeliveryCustomersFromArray(array) {
  //   let anotherItemNumber = 2;
  //   let deliveryCustomers = [];

  //   for (let i = 0; i < array.length; i++) {
  //     let orderRow = array[i];
  //     // if an object with the same order # already exists:
  //     if (deliveryCustomers.some((d) => d.Name === orderRow.Name)) {
  //       let target = deliveryCustomers.find((d) => d.Name === orderRow.Name);
  //       let quant = orderRow["Lineitem quantity"];
  //       let name = orderRow["Lineitem name"];
  //       // making a new key / value pair in an existing object with an item they ordered (and its quantity)
  //       target[`Lineitem ${anotherItemNumber}`] = `${quant} ${name}`;
  //       anotherItemNumber++;
  //     }
  //     // skip the last row and any other rows that don't have any data
  //     else if (!orderRow["Lineitem name"]) continue;
  //     // if there isn't an object with the same order # yet, gotta add one to the deliveryCustomers array
  //     else {
  //       orderRow[
  //         "Lineitem 1"
  //       ] = `${orderRow["Lineitem quantity"]} ${orderRow["Lineitem name"]}`;
  //       delete orderRow["Lineitem name"];
  //       delete orderRow["Lineitem quantity"];
  //       deliveryCustomers.push(orderRow);
  //       anotherItemNumber = 2;
  //     }
  //   }
  //   return deliveryCustomers;
  // }

  // takes in an array of customer objects, returns the same objects with some different keys & values
  function modifyCustomers(array) {

    setLoadingMessage('modifying order objects')

    let inputCustomers = array;
    let modifiedCustomers = []

    // do this for every customer in the array
    for (let i = 0; i < inputCustomers.length; i++) {
      let customer = inputCustomers[i].node;
      console.log(customer)
      // finds all key / value pairs in where the key starts with 'Lineitem'
      let customerItems = customer.lineItems.nodes;

      let itemsCatch = [];
      let dayCatch = [];

      for (const entry in customerItems) {
        const correctFormat = `${customerItems[entry].quantity} ${customerItems[entry].name}`
        console.log(correctFormat)
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

      customer["Notes"] = itemsCatch.join(", ");
      customer["Day of Week"] = dayCatch;

      customer["Seller Order ID"] = customer["name"];
      customer["Name"] = customer.customer.defaultAddress.name;
      customer["Phone Number"] = customer.customer.defaultAddress.phone;
      customer["Address 1"] = customer.customer.defaultAddress.address1;
      customer["Address 2"] = customer.customer.defaultAddress.address2;
      customer["Zip"] = customer.customer.defaultAddress.zip;
      customer["City"] = customer.customer.defaultAddress.city;
      customer["Email"] = customer["email"]
      customer["State"] = customer.customer.defaultAddress.provinceCode;

      let earliestTime, latestTime;

      if (customer.customAttributes.length === 3) {
        earliestTime = customer.customAttributes
          .filter((item) => item.key.includes("The earliest"))[0]
          .value;
        latestTime = customer.customAttributes
          .filter((item) => item.key.includes("The latest"))[0]
          .value;
      }

      customer["Earliest Time"] = earliestTime;
      customer["Latest Time"] = latestTime;

      delete customer["createdAt"]
      delete customer["customAttributes"]
      delete customer["customer"]
      delete customer["displayFulfillmentStatus"]
      delete customer["email"]
      delete customer["lineItems"]
      delete customer["name"]
      delete customer["note"]

      // if all of the days in the dayCatch array are not the same, customer probably selected multiple days
      // and you should know about that to reach out to them and see what's up
      if (!dayCatch.every((val) => val === dayCatch[0])) {
        customer["ERROR"] = "multiple days";
      }
      // if all of the days are the same:
      else customer["Day of Week"] = dayCatch[0];

      modifiedCustomers.push(customer)
    }

    return modifiedCustomers;
  }

  async function processShopifyCSVForCircuit(results, allowed) {
    // console.log("doing main function");
    setLoadingMessage('filtering data for target date')
    const filtered = getOnlyTargetDayObjects(results);
    // filtering again to get rid of those "Lineitem #" k / v pairs that we don't need anymore
    const modifiedCustomers = modifyCustomers(filtered);
    // const testie = [...modifiedCustomers].filter((r) =>
    //   r.Name.includes("Mason")
    // );
    return modifiedCustomers;
  }

  async function shopifySubmit(results) {
    
    const modifiedCustomers = await processShopifyCSVForCircuit(
      results,
      shopifyAllowed
    );
    setShopifyArray(modifiedCustomers);
  }

  function doAPIRequest(e) {
    e.preventDefault();
    setLoadingMessage('getting data from Shopify API')
    fetch(`https://glb-function-delta.vercel.app/api/hello?date=${ordersDate}`)
      .then((resp) => resp.json())
      .then((data) => {
        setAPIData(data.orders.edges);
        shopifySubmit(data.orders.edges, shopifyAllowed);
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
      <button onClick={(e) => doAPIRequest(e)}>Do the thing</button>
    </section>
  );

}
