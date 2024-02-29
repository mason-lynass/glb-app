import { usePapaParse, useCSVReader, useCSVDownloader } from "react-papaparse";

export default function Circuit({
  styles,
  setDriverOneInventory,
  setDriverTwoInventory,
  setDriverThreeInventory,
  setDriverOne,
  setDriverTwo,
  setDriverThree,
  setCircuitArray,
}) {
  const { CSVReader } = useCSVReader();

  // turns CSV data imported from file upload into
  // an array of products, one item in the array per order
  function circuitOrderProductsFromCSV(results) {
    const catchArray = [];
    const dailyOrders = results;

    dailyOrders.forEach((order) => {
      let tempArray = [];
      // some rows have products in the "Products" column
      let products = [];
      if (order["products"]) products = order["products"].split("•");
      let notes = "";

      // if they don't have any products in the "Products" column,
      // they're in the "Notes" column
      // products.length will be 1 because "Products" = ['']
      if (products.length < 2) {
        if (order["notes"]) notes = order["notes"].split(",");
        if (order["Notes"]) notes = order["Notes"].split(",");

        // these are already formatted correctly, we don't need to reformat them
        if (notes.length) { 
            catchArray.push(notes.toString());
        }
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
    const justCookies = sortedArray.filter((item) =>
      Object.keys(item).toString().includes("Cookies")
    );
    const noCookies = sortedArray.filter(
      (item) => !Object.keys(item).toString().includes("Cookies")
    );
    const cookieSort = noCookies.concat(justCookies);

    // converting array of objects to array of arrays: [item, quantity]
    const finalArray = [];
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

    // get all products by order for each driver
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
    if (ordersAsDrivers[2] && ordersAsDrivers[2].length > 0) {
      console.log("yes");
      thirdOrderProductsArray = circuitOrderProductsFromCSV(ordersAsDrivers[2]);
    }

    // get all products individually for each driver from sets of orders
    const firstIndividualProductsArray =
      circuitOrderProductsToIndividualProducts(firstOrderProductsArray);
    let secondIndividualProductsArray = undefined;
    if (secondOrderProductsArray !== undefined) {
      secondIndividualProductsArray = circuitOrderProductsToIndividualProducts(
        secondOrderProductsArray
      );
    }
    let thirdIndividualProductsArray = undefined;
    if (thirdOrderProductsArray !== undefined) {
      thirdIndividualProductsArray = circuitOrderProductsToIndividualProducts(
        thirdOrderProductsArray
      );
    }

    // get inventory from all products for each driver from individual products
    const firstResultArray = makeInventoryFromIndividualProducts(
      firstIndividualProductsArray
    );
    let secondResultArray = [];
    if (secondIndividualProductsArray !== undefined) {
      secondResultArray = makeInventoryFromIndividualProducts(
        secondIndividualProductsArray
      );
    }
    let thirdResultArray = [];
    if (thirdIndividualProductsArray !== undefined) {
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
    setCircuitArray(inventoryArray);
    setDriverOneInventory(inventoryArray[0]);
    setDriverTwoInventory(inventoryArray[1]);
    setDriverThreeInventory(inventoryArray[2]);
  }

  return (
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
