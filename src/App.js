import React from "react";
import { assign, interpret, Machine } from "xstate";

const chargeCardApi = cardDetails =>
  new Promise(resolve => setTimeout(() => resolve(), 5000));

const connectPrinter = async () => {
  const device = await navigator.usb.requestDevice({ filters: [] });
  await device.open();
  await device.selectConfiguration(1);
  await device.claimInterface(0);
  await device.controlTransferOut({
    requestType: "class",
    recipient: "interface",
    request: 0x22,
    value: 0x01,
    index: 0x00
  });
  return device;
};

const printTicket = ({ printerDevice, cardDetails, ticketNo }) => {
  const cardNumber = getCardNumber(cardDetails);
  const encoder = new TextEncoder();
  const messages = [
    "\x1b@\n",
    "Live Band",
    "Admit One",
    "General Admission - $10",
    `Paid - **${cardNumber.substr(-4)}`,
    `Ticket No. ${ticketNo}`,
    "\n\n\n"
  ];
  console.log("ticket", messages);
  printerDevice.transferOut(1, encoder.encode(messages.join("\n")));
};

const posMachine = Machine(
  {
    id: "pos",
    initial: "connectPrinter",
    context: {
      cardDetails: null,
      printerDevice: null,
      ticketNo: 0
    },
    states: {
      connectPrinter: {
        initial: "disconnected",
        states: {
          disconnected: {
            on: {
              CONNECT_PRINTER: "connecting"
            }
          },
          connecting: {
            invoke: {
              src: "connectPrinter",
              onDone: {
                target: "connected",
                actions: "recordPrinterDevice"
              },
              onError: "disconnected"
            }
          },
          connected: { type: "final" }
        },
        onDone: "awaitingCard"
      },
      awaitingCard: {
        onEntry: "resetCardDetails",
        on: {
          UPDATE_CARD_DETAILS: { actions: "updateCardDetails" },
          "": { target: "processingTransaction", cond: "cardNumberReceived" }
        }
      },
      processingTransaction: {
        invoke: {
          src: "processTransaction",
          onDone: "transactionProcessed",
          onError: "awaitingCard"
        }
      },
      transactionProcessed: {
        onEntry: ["incTicketCount", "printTicket"],
        after: { 7000: "awaitingCard" }
      }
    }
  },
  {
    actions: {
      updateCardDetails: assign({
        cardDetails: (_, { data }) => data
      }),
      incTicketCount: assign({
        ticketNo: ({ ticketNo }) => ticketNo + 1
      }),
      recordPrinterDevice: assign({
        printerDevice: (ctx, { data }) => data
      }),
      resetCardDetails: assign({
        cardDetails: null
      }),
      printTicket
    },
    services: {
      connectPrinter: () => connectPrinter(),
      processTransaction: ({ cardDetails }) => chargeCardApi(cardDetails)
    },
    guards: {
      cardNumberReceived: ({ cardDetails }) => !!getCardNumber(cardDetails)
    }
  }
);

const getCardNumber = (cardDetails = "") =>
  cardDetails && cardDetails.split("^")[0] && cardDetails.split("^")[1]
    ? cardDetails.split("^")[0].split("%B")[1]
    : null;

const ConnectPrinter = ({
  service: { send },
  current: {
    value: { connectPrinter: printerStatus }
  }
}) => {
  const statusDisplay = status =>
    ({ disconnected: "Connect", connecting: "Connect", connected: "Connected" }[
      status
    ]);

  const isConnected = status => status === "connected";

  return (
    <div>
      <div>
        Thermal Printer{" "}
        <button
          onClick={() => send("CONNECT_PRINTER")}
          disabled={isConnected(printerStatus)}
        >
          {statusDisplay(printerStatus)}
        </button>
      </div>
    </div>
  );
};

class AwaitingCard extends React.Component {
  state = { value: "" };
  componentDidMount() {
    this.cardRef.focus();
  }
  handleChange = e => {
    const { value } = e.target;
    this.setState({ value });
    this.props.service.send({ type: "UPDATE_CARD_DETAILS", data: value });
  };
  render() {
    const { value } = this.state;
    return (
      <React.Fragment>
        <h1>Swipe Card to Purchase</h1>
        <textarea
          style={{ opacity: 0 }}
          ref={node => {
            this.cardRef = node;
          }}
          value={value}
          onChange={this.handleChange}
        />
      </React.Fragment>
    );
  }
}

const ProcessingTransaction = ({
  current: {
    context: { cardDetails }
  }
}) => (
  <h2>
    Charging $10.00 to **
    {getCardNumber(cardDetails).substr(-4, 4)}
    ...
  </h2>
);

const TransactionProcessed = () => (
  <React.Fragment>
    <h2>Your ticket is being printed, please present it at the gate.</h2>
    <h2>Enjoy the show.</h2>
  </React.Fragment>
);

class App extends React.Component {
  state = {
    current: posMachine.initialState
  };

  service = interpret(posMachine).onTransition(current =>
    this.setState({ current })
  );

  componentDidMount() {
    this.service.start();
  }

  componentWillUnmount() {
    this.service.stop();
  }

  renderStep = () => {
    const { current } = this.state;
    if (current.matches("connectPrinter")) {
      return <ConnectPrinter service={this.service} {...{ current }} />;
    }
    if (current.matches("awaitingCard")) {
      return <AwaitingCard service={this.service} />;
    }
    if (current.matches("processingTransaction")) {
      return <ProcessingTransaction {...{ current }} />;
    }
    if (current.matches("transactionProcessed")) {
      return <TransactionProcessed />;
    }
    return null;
  };

  render() {
    const { current } = this.state;

    console.log(current);

    return (
      <div>
        <h1>🎸 Live Band 🥁</h1>
        <h2>🎟️ General Admission - $10.00 🎟️</h2>
        <br />
        <br />
        {this.renderStep()}
      </div>
    );
  }
}

export default App;
