import { useCSVReader, useCSVDownloader } from "react-papaparse";

export default function Shopify({ setShopifyArray, styles }) {
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
    "Name",
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

  // turns an array of customer data from the CSV into an array of customer objects
  function getShopifyDeliveryCustomersFromArray(array) {
    let anotherItemNumber = 2;
    let deliveryCustomers = [];

    for (let i = 0; i < array.length; i++) {
      let orderRow = array[i];
      // if an object with the same order # already exists:
      if (deliveryCustomers.some((d) => d.Name === orderRow.Name)) {
        let target = deliveryCustomers.find((d) => d.Name === orderRow.Name);
        let quant = orderRow["Lineitem quantity"];
        let name = orderRow["Lineitem name"];
        // making a new key / value pair in an existing object with an item they ordered (and its quantity)
        target[`Lineitem ${anotherItemNumber}`] = `${quant} ${name}`;
        anotherItemNumber++;
      }
      // skip the last row and any other rows that don't have any data
      else if (!orderRow["Lineitem name"]) continue;
      // if there isn't an object with the same order # yet, gotta add one to the deliveryCustomers array
      else {
        orderRow[
          "Lineitem 1"
        ] = `${orderRow["Lineitem quantity"]} ${orderRow["Lineitem name"]}`;
        delete orderRow["Lineitem name"];
        delete orderRow["Lineitem quantity"];
        deliveryCustomers.push(orderRow);
        anotherItemNumber = 2;
      }
    }
    return deliveryCustomers;
  }

   // takes in an array of customer objects, returns the same objects with some different keys & values
   function modifyCustomers(array) {
    console.log(array)
    let modifiedCustomers = array;

    // do this for every customer in the array
    for (let i = 0; i < modifiedCustomers.length; i++) {
      let customer = modifiedCustomers[i];
      // finds all key / value pairs in where the key starts with 'Lineitem'
      let customerItems = Object.keys(customer)
        .filter((key) => key.slice(0, 8).includes("Lineitem"))
        .reduce((obj, key) => {
          return {
            ...obj,
            [key]: customer[key],
          };
        }, {});

      let itemsCatch = [];
      let dayCatch = [];

      for (const entry in customerItems) {
        const lastIndexOfDash = customerItems[entry].lastIndexOf(" - ");
        // just the first part of the customerItem string
        // "1 Pepperoni - Wednesday, 11/15 (Seattle, mostly north of the ship canal)" becomes
        // "1 Pepperoni"
        let item = customerItems[entry].split(" - ")[0];
        // and "Wednesday, 11/15 (Seattle, mostly north of the ship canal)"
        let dayOfWeek = customerItems[entry].slice(lastIndexOfDash + 3);

        // this is a catch for the cookies
        // removing "Really Good"
        if (customerItems[entry].includes("Really Good")) {
          item = `${customerItems[entry].slice(0, 1)} ${customerItems[
            entry
          ].slice(14)}`;
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

      customer["Seller Order ID"] = customer["Name"];
      customer["Name"] = customer["Shipping Name"];
      customer["Phone Number"] = customer["Shipping Phone"];
      customer["Address 1"] = customer["Shipping Street"].split(",")[0];
      customer["Address 2"] = customer["Shipping Street"].split(",")[1];
      customer["Zip"] = customer["Shipping Zip"];
      customer["City"] = customer["Shipping City"];
      customer["State"] = customer["Shipping Province"];

      let earliestTime, latestTime

      if (customer["Note Attributes"].split("\n").length === 3) {
        earliestTime = customer["Note Attributes"].split("\n").filter((item) => item.includes('The earliest'))[0].slice(-8)
        latestTime = customer["Note Attributes"].split("\n").filter((item) => item.includes('The latest'))[0].slice(-8)
      }

      customer["Earliest Time"] = earliestTime
      customer["Latest Time"] = latestTime

      delete customer["Shipping Phone"];
      delete customer["Shipping Name"];
      delete customer["Shipping Phone"];
      delete customer["Shipping Street"];
      delete customer["Shipping Zip"];
      delete customer["Shipping City"];
      delete customer["Shipping Province"];
      delete customer["Note Attributes"];

      // if all of the days in the dayCatch array are not the same, customer probably selected multiple days
      // and you should know about that to reach out to them and see what's up
      if (!dayCatch.every((val) => val === dayCatch[0])) {
        customer["ERROR"] = "multiple days";
      }
      // if all of the days are the same:
      else customer["Day of Week"] = dayCatch[0];
    }

    return modifiedCustomers;
  }

  async function processShopifyCSVForCircuit(results, allowed) {
    // console.log("doing main function");
    
    const filtered = filterKeysInObjectsInArrayByKeys(results, allowed);
    
    const deliveryCustomers = getShopifyDeliveryCustomersFromArray(filtered);
    console.log(deliveryCustomers);
    // filtering again to get rid of those "Lineitem #" k / v pairs that we don't need anymore
    const modifiedCustomers = filterKeysInObjectsInArrayByKeys(
      modifyCustomers(deliveryCustomers), shopifyAllowed
    );
    const testie = [...modifiedCustomers].filter((r) => r.Name.includes('Mason'))
    console.log(testie)
    return modifiedCustomers;
  }

  async function shopifySubmit(results) {
    const modifiedCustomers = await processShopifyCSVForCircuit(
      results.data,
      shopifyAllowed
    );
    setShopifyArray(modifiedCustomers);
  }

  return (
    <section id="shopify-csv-reader">
      <h3>Upload the day's Shopify CSV file here:</h3>
      <CSVReader
        onUploadAccepted={(results) => shopifySubmit(results)}
        config={{
          header: true,
          worker: true,
          error: (e) => console.log(e),
        }}
      >
        {({ getRootProps, acceptedFile, ProgressBar, getRemoveFileProps }) => (
          <>
            <div style={styles.csvReader}>
              <button
                type="button"
                {...getRootProps()}
                style={styles.browseFile}
              >
                Browse file
              </button>
              <div style={styles.acceptedFile}>
                {acceptedFile && acceptedFile.name}
              </div>
              <button {...getRemoveFileProps()} style={styles.remove}>
                Remove
              </button>
            </div>
            <ProgressBar style={styles.progressBarBackgroundColor} />
          </>
        )}
      </CSVReader>
    </section>
  );
}
