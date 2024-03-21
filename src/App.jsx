import { useState, useEffect } from "react";
import { usePapaParse, useCSVReader, useCSVDownloader } from "react-papaparse";
import Shopify from "./shopify";
import Bottle from "./Bottle";
import Circuit from "./Circuit";
import "./App.css";

function App() {
  const { CSVDownloader } = useCSVDownloader();

  // for the papaparse stuff
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
  const [loadingMessage, setLoadingMessage] = useState('')

  // only do this when both files are uploaded and processed
  useEffect(() => {
    if (bottleArray.length > 0 && shopifyArray.length > 0) {
      const newOrders = [[...shopifyArray].concat([...bottleArray])];
      setAllOrders(newOrders);
      setDayOfWeekErrors(newOrders[0].filter((o) => o.ERROR));
      setLoadingMessage('Bottle & Shopify finished')
    }
  }, [bottleArray, shopifyArray]);

  function shopifyOrders(orders) {
    return (
      <>
        <h4>--- Shopify orders ---</h4>
        {orders.map((o) => {
          return (
            <div className="one-order" key={o[`Seller Order ID`]}>
              <p>{o[`Seller Order ID`]}</p>
              <p>{o[`Name`]}</p>
              <p>{o["Address 1"]}</p>
              <p>{o["City"]}</p>
              <p>{o["Email"]}</p>
              <p>
                {o["Earliest Time"] === "11:00 AM" ? "" : o["Earliest Time"]}
              </p>
              <p>{o["Latest Time"] === "05:30 PM" ? "" : o["Latest Time"]}</p>
              <p>{o["Day of Week"]}</p>
            </div>
          );
        })}
      </>
    );
  }

  function bottleOrders(orders) {
    return (
      <>
        <h4>--- Bottle orders ---</h4>
        {orders.map((o) => {
          return (
            <div className="one-order" key={o[`Seller Order ID`]}>
              <p>{o[`Seller Order ID`]}</p>
              <p>{o[`Name`]}</p>
              <p>{o["Address 1"]}</p>
              <p>{o["City"]}</p>
              <p>{o["Email"]}</p>
              <p>
                {o["Earliest Time"] === "10:30 AM" ? "" : o["Earliest Time"]}
              </p>
              <p>{o["Latest Time"] === "6:00 PM" ? "" : o["Latest Time"]}</p>
              <p>-</p>
            </div>
          );
        })}
      </>
    );
  }

  function dOWErrors() {
    return (
      <div>
        <h4>--- Day of Week errors ---</h4>
        {dayOfWeekErrors.map((o) => {
          return (
            <div className="one-order error">
              <p>{o[`Seller Order ID`]}</p>
              <p>{o[`Name`]}</p>
              <p>{o["Address 1"]}</p>
              <p>{o["City"]}</p>
              <p>{o["Email"]}</p>
              <p>{o["Day of Week"]}</p>
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
            <div className="one-inventory-item" key={i[0]}>
              <p className="oii-count">{i[1]}</p>
              <p className="oii-description">{i[0]}</p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <>
      <header>
        <h1>Good Luck Bread Logistics Helper</h1>
      </header>
      <main>
        <div id="csv-import-flex">
          <Bottle setBottleArray={setBottleArray} setLoadingMessage={setLoadingMessage}/>
          <Shopify setShopifyArray={setShopifyArray} setLoadingMessage={setLoadingMessage}/>
        </div>
        <div>
          <p id='loading-message'>{loadingMessage}</p>
        </div>
        <section id="orders-table">
          <div id='orders-count-flex'>
            <h4># of Shopify Orders: {shopifyArray.length}</h4>
            <h4># of Bottle Orders: {bottleArray.length}</h4>
            <h4>Day of Week errors: {dayOfWeekErrors.length}</h4>
          </div>
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
        <Circuit
          setDriverOneInventory={setDriverOneInventory}
          setDriverTwoInventory={setDriverTwoInventory}
          setDriverThreeInventory={setDriverThreeInventory}
          styles={styles}
          setDriverOne={setDriverOne}
          setDriverTwo={setDriverTwo}
          setDriverThree={setDriverThree}
          setCircuitArray={setCircuitArray}
        />
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
