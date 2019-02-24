Ticketing POS system proof-of-concept. An ESC/POS POS POC.

Uses a magnetic card reader (acts as keyboard input) to read and "charge" a credit card and uses WebUSB to output the ticket/receipt to a thermal printer. Flow controlled with [xstate](http://xstate.js.org).

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

---

#### Hardware used
- Card reader - https://www.amazon.com/gp/product/B07CT3VWN6
- Thermal printer - https://www.amazon.com/gp/product/B07848ZBXT
  - ESC/POS command set - http://mike42.me/blog/what-is-escpos-and-how-do-i-use-it

---
#### Running
- `yarn`
- `yarn start`
- http://localhost:3000
