import { useState, useEffect } from "react";
import { usePapaParse, useCSVReader, useCSVDownloader } from "react-papaparse";
import { CSVLink } from "react-csv";
import "./App.css";

function App() {
  const { CSVReader } = useCSVReader();
  const { CSVDownloader } = useCSVDownloader();

  const [shopifyFile, setShopifyFile] = useState(null);
  const [shopifyArray, setShopifyArray] = useState([]);
  const [bottleArray, setBottleArray] = useState([]);
  const [circuitFileName, setCircuitFileName] = useState("");
  const [circuitArray, setCircuitArray] = useState([]);
  const [driverOneInventory, setDriverOneInventory] = useState([]);
  const [driverTwoInventory, setDriverTwoInventory] = useState([]);
  const [driverThreeInventory, setDriverThreeInventory] = useState([]);
  const [driverOne, setDriverOne] = useState("");
  const [driverTwo, setDriverTwo] = useState("");
  const [driverThree, setDriverThree] = useState("");
  const [allOrders, setAllOrders] = useState([]);
  const [dayOfWeekErrors, setDayOfWeekErrors] = useState([]);

  // only do this when both files are uploaded and processed
  useEffect(() => {
    if (bottleArray.length > 0 && shopifyArray.length > 0) {
      const newOrders = [[...shopifyArray].concat([...bottleArray])];
      setAllOrders(newOrders);
      setDayOfWeekErrors(newOrders[0].filter((o) => o.ERROR));
    }
  }, [bottleArray, shopifyArray]);

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

  // for now, this is a reverse filter, add columns we don't need
  const bottleAllowed = [
   "Account Credit Used",
   "Amount Charged to Customer",
   "Bottle Fee",
   "Cart Total",
   "Dietary Options",
   "Discount",
   "Fee Charged to Customer",
   "Fulfillment",
   "Fulfillment Method",
   "Fulfillment Notes",
   "Fulfillment Slot Day",
   "Fulfillment Slot Time",
   "Membership Settings",
   "Membership Tier",
   "Net",
   "Number of Items",
   "Number Of Times Customer Has Ordered",
   "Package",
   "Payment Status",
   "Processing Fee",
   "Refund",
   "Store",
   "Subtotal",
   "Tax",
   "Tip",
   "Total",
   "Transaction Date",
   "What's your name?"
  ]

  // this function works with any array of strings, you can give it any list of headers to use in the filter
  // but right now I'm only using this with 'allowed'
  function filterKeysInObjectsInArrayByKeys(array, allowed) {
    return array.map((r) => {
      if (allowed === bottleAllowed) {
        return Object.keys(r)
        .filter((key) => !allowed.includes(key))
        .reduce((obj, key) => {
          return {
            ...obj,
            [key]: r[key],
          };
        }, {});
      }

      else return Object.keys(r)
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

    // turns an array of customer data from the CSV into an array of customer objects
    function getBottleDeliveryCustomersFromArray(array) {
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
      customer["Earliest Time"] = customer["Note Attributes"];
      // .split("\n")[0]
      // .slice(-8);
      customer["Latest Time"] = customer["Note Attributes"];
      // .split("\n")[1]
      // .slice(-8);

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
    console.log("doing main function");
    console.log()
    const filtered = filterKeysInObjectsInArrayByKeys(results, allowed);
    console.log(filtered)
    const deliveryCustomers = getShopifyDeliveryCustomersFromArray(filtered);
    console.log(deliveryCustomers)
    // filtering again to get rid of those "Lineitem #" k / v pairs that we don't need anymore
    const modifiedCustomers = filterKeysInObjectsInArrayByKeys(
      modifyCustomers(deliveryCustomers)
    );

    return modifiedCustomers;
  }

  async function processBottleCSVForCircuit(results, allowed) {
    console.log("doing main function");
    console.log()
    const filtered = filterKeysInObjectsInArrayByKeys(results, allowed);
    console.log(filtered)
    const deliveryCustomers = getBottleDeliveryCustomersFromArray(filtered);
    console.log(deliveryCustomers)
    // filtering again to get rid of those "Lineitem #" k / v pairs that we don't need anymore
    const modifiedCustomers = filterKeysInObjectsInArrayByKeys(
      modifyCustomers(deliveryCustomers)
    );

    return modifiedCustomers;
  }

  async function shopifySubmit(results) {
    console.log(results);
    const modifiedCustomers = await processCSVForCircuit(results.data, shopifyAllowed);
    setShopifyArray(modifiedCustomers);
  }

  async function bottleSubmit(results) {
    console.log(results);
    const modifiedCustomers = await processCSVForCircuit(results.data, bottleAllowed);
    setBottleArray(modifiedCustomers);
  }

  // turns CSV data imported from file upload into
  // an array of products, one item in the array per order
  function circuitOrderProductsFromCSV(results) {
    const catchArray = [];
    const dailyOrders = results;

    console.log(dailyOrders)

    dailyOrders.forEach((order) => {
      let tempArray = [];
      // some rows have products in the "Products" column
      let products = []
      if (order["products"]) products = order["products"].split("•");
      let notes = "";

      

      // if they don't have any products in the "Products" column,
      // they're in the "Notes" column
      // products.length will be 1 because "Products" = ['']
      if (products.length < 2) {
        if (order["notes"]) notes = order["notes"].split(",");
        if (order["Notes"]) notes = order["Notes"].split(",");
        
        // these are already formatted correctly, we don't need to reformat them
        if (notes.length !== 1) catchArray.push(notes.toString());
      }

      // if there are products in the "Products" column,
      // prooducts.length will be > 1
      else {
        products.forEach((i) => {
          // when they're in the "Products" column,
          // they have a PID that we don't need to use
          const check = i.indexOf("(PID");
          if (check > 0) {
            tempArray.push(i.slice(0, check - 1));
          }
        });
        catchArray.push(tempArray.toString());
      }
    });

    return catchArray;
  }

  function circuitOrderProductsToIndividualProducts(data) {
    // converts one array of strings which could contain multiple comma-separated items
    // to one array of strings, one item per index
    const dataString = data.toString();
    const resultArray = dataString.split(",");
    return resultArray;
  }

  function makeInventoryFromIndividualProducts(inputArray) {
    console.log(inputArray)
    const resultArray = [];

    for (let i = 0; i < inputArray.length; i++) {
      let target = inputArray[i];

      if (target === "1 Thermal Bag") continue;
      if (target.indexOf("Bake") > 0)
        target = target.slice(0, target.indexOf("Bake") - 2);
      // just removing a space if the string starts with a space
      if (target[0] === " ") target = target.slice(1);
      // just the item, not the quantity
      let product = target.slice(2).toString();
      // just the quantity, as an integer
      let count = parseInt(target.slice(0, 1));

      // if the array is empty, gotta add the first product
      if (resultArray.length < 1) resultArray.push({ [product]: count });
      // if the array has an object with key === product, add the quantity to the current quantity
      else if (
        resultArray.filter((r) => Object.keys(r).includes(product)).length > 0
      ) {
        //   console.log("filter one", product);
        let currentProduct = resultArray.filter(
          (r) => Object.keys(r)[0] === product
        )[0];
        currentProduct[product] = currentProduct[product] + count;
      }
      // if the array is not empty but it doesn't have that product yet, add it to the array
      else if (
        resultArray.filter((r) => Object.keys(r).includes(product)).length === 0
      ) {
        //   console.log("adding a product");
        resultArray.push({ [product]: count });
      }
    }

    // sorts by quantity of item
    const sortedArray = resultArray.sort(
      (a, b) => Object.values(b)[0] - Object.values(a)[0]
    );

    // visually it's nice when the inventory looks like
    // pizza
    // alcohol
    // cookies
    // and there are usually pretty low quantities of alcohol, compared to pizza
    // so we make an array of cookies and an array of not-cookies, then put the cookies after the not-cookies
    const justCookies = sortedArray.filter((item) => Object.keys(item).toString().includes('Cookies'))
    const noCookies = sortedArray.filter((item) => !Object.keys(item).toString().includes('Cookies'))
    const cookieSort = noCookies.concat(justCookies);

    // converting array of objects to array of arrays: [item, quantity]
    const finalArray = []    
    cookieSort.forEach((entry) => {
      finalArray.push([Object.keys(entry)[0], Object.values(entry)[0]]);
    });

    return finalArray;
  }

  function splitIntoDrivers(input) {
    // this is pretty logically simple, I think

    const firstDriver = input.data[0].driver;
    setDriverOne(firstDriver);
    const firstDriverOrders = input.data.filter(
      (order) => order.driver === firstDriver
    );
    const otherOrders = input.data.filter(
      (order) => order.driver !== firstDriver
    );

    let secondDriverOrders;
    let thirdDriverOrders;
    if (otherOrders.length > 0) {
      const secondDriver = otherOrders[0].driver;
      setDriverTwo(secondDriver);
      secondDriverOrders = otherOrders.filter(
        (order) => order.driver === secondDriver
      );

      thirdDriverOrders = input.data.filter(
        (order) => order.driver !== secondDriver && order.driver !== firstDriver
      );

      if (thirdDriverOrders.length > 0) {
        setDriverThree(thirdDriverOrders[0].driver);
      }
    }

    return [firstDriverOrders, secondDriverOrders, thirdDriverOrders];
  }

  async function processCircuitCSV(results) {
    // split all orders into 1-3 drivers
    const ordersAsDrivers = splitIntoDrivers(results);

    const firstOrderProductsArray = circuitOrderProductsFromCSV(
      ordersAsDrivers[0]
    );
    let secondOrderProductsArray = undefined;
    if (ordersAsDrivers[1]) {
      console.log("yes");
      secondOrderProductsArray = circuitOrderProductsFromCSV(
        ordersAsDrivers[1]
      );
    }
    let thirdOrderProductsArray = undefined;
    if (ordersAsDrivers[2]) {
      console.log("yes");
      thirdOrderProductsArray = circuitOrderProductsFromCSV(ordersAsDrivers[2]);
    }

    const firstIndividualProductsArray =
      circuitOrderProductsToIndividualProducts(firstOrderProductsArray);
    let secondIndividualProductsArray = undefined;
    if (secondOrderProductsArray !== undefined) {
      console.log("ya");
      secondIndividualProductsArray = circuitOrderProductsToIndividualProducts(
        secondOrderProductsArray
      );
    }
    let thirdIndividualProductsArray = undefined;
    if (thirdOrderProductsArray !== undefined) {
      console.log("ya");
      thirdIndividualProductsArray = circuitOrderProductsToIndividualProducts(
        thirdOrderProductsArray
      );
    }

    const firstResultArray = makeInventoryFromIndividualProducts(
      firstIndividualProductsArray
    );
    let secondResultArray = [];
    if (secondIndividualProductsArray !== undefined) {
      console.log("uh huh");
      secondResultArray = makeInventoryFromIndividualProducts(
        secondIndividualProductsArray
      );
    }
    let thirdResultArray = [];
    if (thirdIndividualProductsArray !== undefined) {
      console.log("uh huh");
      thirdResultArray = makeInventoryFromIndividualProducts(
        thirdIndividualProductsArray
      );
    }
    return [firstResultArray, secondResultArray, thirdResultArray];
  }

  async function circuitSubmit(results) {
    // process the input CSV, assign new values to state variables
    // which should change the DOM
    const inventoryArray = await processCircuitCSV(results);
    console.log(inventoryArray)
    setCircuitArray(inventoryArray);
    setDriverOneInventory(inventoryArray[0]);
    setDriverTwoInventory(inventoryArray[1]);
    setDriverThreeInventory(inventoryArray[2]);
  }

  function shopifyOrders(orders) {
    console.log(orders);
    // return <h4>Number of Shopify orders: {orders.length}</h4>;
    return (
      <>
        <h4>Number of Shopify orders: {orders.length}</h4>
        {orders.map((o) => {
          return (
            <div className="one-order">
              <p>{o[`Seller Order ID`]}</p>
              <p>{o[`Name`]}</p>
            </div>
          );
        })}
      </>
    );
  }

  function bottleOrders(orders) {
    return <h4>Number of Bottle orders: {orders.length}</h4>;
  }

  function dOWErrors() {
    return (
      <div>
        <h4>Day of Week errors: {dayOfWeekErrors.length}</h4>
        {dayOfWeekErrors.map((o) => {
          return (
            <div className="one-order error">
              <p>{o["Seller Order ID"]}</p>
              <p>{o.Name}</p>
              <p>{o["Day of Week"]}</p>
              <p>{o["Address 1"]}</p>
            </div>
          );
        })}
      </div>
    );
  }

  function circuitInventory(driver, items) {
    return (
      <div id="circuit-inventory">
        <h3>Inventory for {driver}</h3>
        {items.map((i) => {
          return (
            <div className="one-inventory-item">
              <p className="oii-count">{i[1]}</p>
              <p className="oii-description">{i[0]}</p>
            </div>
          );
        })}
      </div>
    );
  }

  const styles = {
    csvReader: {
      display: "flex",
      flexDirection: "row",
      marginBottom: 10,
    },
    browseFile: {
      width: "130px",
    },
    acceptedFile: {
      border: "1px solid #ccc",
      height: 45,
      lineHeight: 2.5,
      paddingLeft: 10,
      width: "80%",
      margin: "0 10px",
    },
    remove: {
      borderRadius: 0,
      padding: "0 20px",
    },
    progressBarBackgroundColor: {
      backgroundColor: "red",
    },
  };

  return (
    <>
      <header>
        <h1>Good Luck Bread Logistics Helper</h1>
      </header>
      <main>
        {/* <section>
          <form
          // onSubmit={shopifySubmit}
          >
            <div>
              <label>Upload the day's Shopify CSV file here:</label>
              <input
                type="file"
                id="shopify_csv"
                name="shopify_csv"
                accept=".csv"
                onChange={(e) => handleFileChange(e)}
              />
            </div>
            <button>Submit</button>
          </form>
        </section> */}
        <div id="csv-import-flex">
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
              {({
                getRootProps,
                acceptedFile,
                ProgressBar,
                getRemoveFileProps,
              }) => (
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
          <section id="bottle-csv-reader">
            <h3>Upload the day's Bottle CSV file here:</h3>
            <CSVReader
              onUploadAccepted={(results) => bottleSubmit(results)}
              config={{
                header: true,
                worker: true,
                error: (e) => console.log(e),
              }}
            >
              {({
                getRootProps,
                acceptedFile,
                ProgressBar,
                getRemoveFileProps,
              }) => (
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
        </div>
        <section>
          {shopifyArray.length > 0 ? shopifyOrders(shopifyArray) : ""}
          {bottleArray.length > 0 ? bottleOrders(bottleArray) : ""}
          {dOWErrors()}
        </section>
        <div id="circuit-file-downloader">
          <section id="circuit-filename-input">
            <label>
              Type a file name for the CSV file to import in Circuit:
            </label>
            <input
              type="text"
              value={circuitFileName}
              onChange={(e) => setCircuitFileName(e.target.value)}
            ></input>
          </section>
          <section>
            <CSVDownloader
              filename={circuitFileName}
              data={allOrders[0]}
              type="button"
            >
              Download the Circuit CSV file
            </CSVDownloader>
          </section>
        </div>
        <hr />
        <section id="circuit-csv-reader">
          <h3>Upload the day's Circuit CSV file here:</h3>
          <CSVReader
            onUploadAccepted={(results) => circuitSubmit(results)}
            config={{
              header: true,
              worker: true,
              error: (e) => console.log(e),
            }}
          >
            {({
              getRootProps,
              acceptedFile,
              ProgressBar,
              getRemoveFileProps,
            }) => (
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
        <section id="final-inventory">
          {driverOneInventory.length > 0
            ? circuitInventory(driverOne, driverOneInventory)
            : ""}
          {driverTwoInventory.length > 0
            ? circuitInventory(driverTwo, driverTwoInventory)
            : ""}
          {driverThreeInventory.length > 0
            ? circuitInventory(driverThree, driverThreeInventory)
            : ""}
        </section>
      </main>
    </>
  );
}

export default App;
