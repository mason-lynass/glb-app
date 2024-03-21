import { usePapaParse, useCSVReader, useCSVDownloader } from "react-papaparse";

export default function Bottle({ setBottleArray, setLoadingMessage, styles }) {
  const { CSVReader } = useCSVReader();
  const { CSVDownloader } = useCSVDownloader();

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
    "What's your name?",
  ];

  const finalFilter = [
    "Address 1",
    "Address 2",
    "City",
    "Earliest Time",
    "Email",
    "Latest Time",
    "Name",
    "Notes",
    "Phone Number",
    "Seller Order ID",
    "State",
    "Zip"
  ]

  // this function works with any array of strings, you can give it any list of headers to use in the filter
  // but right now I'm only using this with 'allowed'
  function filterKeysInObjectsInArrayByKeys(array, allowed) {
    if (allowed === bottleAllowed) {
        return array.map((r) => {
            return Object.keys(r)
              .filter((key) => !allowed.includes(key))
              .reduce((obj, key) => {
                return {
                  ...obj,
                  [key]: r[key],
                };
              }, {});
          });
    }
    else {
      setLoadingMessage('Bottle processing complete')
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
  }

  // turns an array of customer data from the CSV into an array of customer objects
  function getBottleDeliveryCustomersFromArray(array) {
    console.log(array);
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
    setLoadingMessage('formatting customer objects')
    let modifiedCustomers = array;

    // do this for every customer in the array
    for (let i = 0; i < modifiedCustomers.length; i++) {
      let customer = modifiedCustomers[i];
      // finds all key / value pairs in where the key starts with 'Lineitem'
      let customerItems = Object.keys(customer)
        .filter((key) => key.includes("PID"))
        .reduce((obj, key) => {
          return {
            ...obj,
            [key]: customer[key],
          };
        }, {});

      let itemsCatch = [];

      for (let entry in customerItems) {
        // this is a catch for the cookies
        // removing "Really Good"

        const itemQuantity = customerItems[entry]

        if (itemQuantity < 1) continue;

        if (entry.includes("Really Good")) {
          entry = `${entry.slice(12)}`;
        }

        // removing unnecessary extra info
        const parenth = entry.indexOf("(");
        if (parenth < entry.indexOf("-")) {
          entry = entry.slice(0, parenth - 1);
        }

        itemsCatch.push(`${itemQuantity} ${entry}`);
      }

      customer["Notes"] = itemsCatch.join(", ");

      customer["Seller Order ID"] = customer["Bottle ID"];
      customer["Name"] = customer["Customer Name"];
      customer["Phone Number"] = customer["Phone"];
      customer["Address 1"] = customer["Address1"];
      customer["Address 2"] = customer["Address2"];
      customer["Earliest Time"] = customer["What's the Earliest Time You Can Accept Delivery?"];
      customer["Latest Time"] = customer["What's the Latest Time You Can Accept Delivery?"];
    }

    return modifiedCustomers;
  }

  async function processBottleCSVForCircuit(results, allowed) {
    const filtered = filterKeysInObjectsInArrayByKeys(results, allowed);
    // const deliveryCustomers = getBottleDeliveryCustomersFromArray(filtered);
    // console.log(deliveryCustomers);
    // filtering again to get rid of those "Lineitem #" k / v pairs that we don't need anymore
    const modifiedCustomers = filterKeysInObjectsInArrayByKeys(
      modifyCustomers(filtered),
      finalFilter
    );

    return modifiedCustomers;
  }

  async function bottleSubmit(results) {
    setLoadingMessage('filtering unwanted data')
    const modifiedCustomers = await processBottleCSVForCircuit(
      results.data,
      bottleAllowed
    );
    setBottleArray(modifiedCustomers);
  }

  return (
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
