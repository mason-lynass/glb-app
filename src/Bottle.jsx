import { read, utils } from 'xlsx';

export default function Bottle({ setBottleArray, setLoadingMessage }) {

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
  function filterKeysInObjectsInArrayByKeys(array, allowed) {
    // removing any key that IS in bottleAllowed
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
    // removing any key that IS NOT in the allowed argument
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
        
        const itemQuantity = customerItems[entry]

        if (itemQuantity < 1) continue;

        // this is a catch for the cookies
        // removing "Really Good"
        if (entry.includes("Really Good")) {
          entry = `${entry.slice(12)}`;
        }

        // removing unnecessary extra info
        const parenth = entry.indexOf("(");
        if (parenth < entry.indexOf("-")) {
          entry = entry.slice(0, parenth - 1);
        }

        // add item to itemsCatch array
        itemsCatch.push(`${itemQuantity} ${entry}`);
      }

      // adding key/value pairs in the format that Circuit wants
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
    // first it goes through the bottleAllowed filter to get rid of unwanted columns
    const filtered = filterKeysInObjectsInArrayByKeys(results, allowed);
    // then it goes through modifyCustomers to transform customer objects,
    // before filtering again to get rid of those "Lineitem #" k / v pairs that we don't need anymore
    const modifiedCustomers = filterKeysInObjectsInArrayByKeys(
      modifyCustomers(filtered),
      finalFilter
    );

    return modifiedCustomers;
  }

  async function bottleSubmit(e) {
    // from https://docs.sheetjs.com/docs/demos/frontend/react/
    const file = e.target.files[0]
    const aB = await file.arrayBuffer()
    const workbook = read(aB)

    const targetSheetName = workbook.SheetNames.filter((sheet) => sheet.includes('Orders'))
    const ordersSheet = workbook.Sheets[targetSheetName]
    const data = utils.sheet_to_json(ordersSheet)

    setLoadingMessage('filtering unwanted data')
    const modifiedCustomers = await processBottleCSVForCircuit(
      data,
      bottleAllowed
    );
    setBottleArray(modifiedCustomers);
  }

  return (
    <section id="bottle-csv-reader">
      <h3>Upload the day's Bottle CSV file here:</h3>
      <input type="file" id='bottle-xls-input' onChange={(e) => bottleSubmit(e)}/>
    </section>
  );
}
