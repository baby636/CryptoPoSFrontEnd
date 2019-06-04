//const command = require("shebang!../bin/command");
import React from 'react';
import { Helmet } from 'react-helmet';
import axios from 'axios';
import openSocket from 'socket.io-client';
import QRAddress21 from '../QRAddress21';
import './styles/cashier.scss'

const HDKey = require('ethereumjs-wallet/hdkey');
const BITBOXSDK = require("@chris.troutner/bitbox-js");
// initialize BITBOX
const BITBOX = new BITBOXSDK({ restURL: "https://trest.bitcoin.com/v2/" });

const socket = openSocket('http://localhost:3000');

const defaultWebURL = 'https://www.meetup.com/The-Bitcoin-Bay';


export default class Cashier extends React.Component {
  constructor() {
    super();
    this.handleClick = this.handleClick.bind(this);
    this.clearOrder = this.clearOrder.bind(this);
    this.updatePrices = this.updatePrices.bind(this);
    this.calculateCryptoAmount = this.calculateCryptoAmount.bind(this);
    this.generateBitcoinAddress = this.generateBitcoinAddress.bind(this);
    this.sendSocketIO = this.sendSocketIO.bind(this);
    this.toggleCryptoType = this.toggleCryptoType.bind(this);
    this.state = {
      jsonData: null,
      cryptoType: 'BCH',
      fiatType: 'CAD',
      fiatAmount: 0,
      cryptoAmount: 0,
      cryptoPrice: 0,
      url: defaultWebURL,
      utxo: null,
      pos_id: null,
      pos_name: null,
      pos_xpub_address: null,
      pos_xpub_index: 0,
      pos_address: null,
      paymentListening: 0
    }
  }

  componentDidMount() {
    this.updatePrices();
    setInterval(() => {
      this.updatePrices();
    }, 600000);

    this.setState({ pos_id: this.props.location.query }, () => {
      const pos_data = {
        pos_id: this.state.pos_id
      };

      axios.post("/api/get-pos-xpub", pos_data).then((res) => {
        this.setState({
          pos_xpub_address: res.data.address,
          pos_xpub_index: res.data.index
        }, () => {
          console.log(this.state);
        });
      });
    });
  }

  clearOrder() {
    socket.emit('event', ['BCH', 'CAD', 0, 0, 0, defaultWebURL]);
    clearInterval(this.state.paymentListening);
    this.setState({ cryptoType: 'BCH', fiatType: 'CAD', fiatAmount: 0, cryptoAmount: 0, url: defaultWebURL, paymentListening: 0 });
  }

  generateBitcoinAddress() {
    let cryptoAmount;
    let options = {
      amount: this.state.cryptoAmount,
      label: '#BitcoinBay',
    };
    let Bip21URL;
    let XPubAddress = BITBOX.Address.fromXPub(this.state.pos_xpub_address, `0/${this.state.pos_xpub_index}`);
    console.log("Format: ", BITBOX.Address.detectAddressFormat(XPubAddress))
    if (this.state.cryptoType === "BTC") {
      let legacyAddress = BITBOX.Address.toLegacyAddress(XPubAddress);
      console.log(legacyAddress);
      Bip21URL = BITBOX.BitcoinCash.encodeBIP21(legacyAddress, options);
    } else {
      Bip21URL = BITBOX.BitcoinCash.encodeBIP21(XPubAddress, options);
      //console.log(Bip21URL)
    }
    this.setState({ url: Bip21URL, pos_address: XPubAddress });
  }

  generateEthereumnAddress() {
    let fromXPub = HDKey.fromExtendedKey(this.state.pos_xpub_address);
    //console.log(XPubAddress);
    let paymentAddress = fromXPub.deriveChild(`0/${this.state.pos_xpub_index}`).getWallet().getAddressString();
    this.setState({ url: paymentAddress, pos_address: paymentAddress });
  }

  calculateCryptoAmount() {
    let cryptoAmount = this.state.fiatAmount/this.state.cryptoPrice;
    console.log("calculate: ", cryptoAmount)
    if (cryptoAmount > 0) {
      if (this.state.cryptoType === "ETH") {
        this.setState({ cryptoAmount: cryptoAmount.toFixed(18) }, () => {
          this.generateEthereumnAddress();
        });
      } else {
        this.setState({ cryptoAmount: cryptoAmount.toFixed(8) }, () => {
          this.generateBitcoinAddress();
        });
      }
    } else {
      this.setState({ cryptoAmount: 0, url: defaultWebURL });
    }
  }

  handleClick(event) {
    let payAmount = parseFloat(event.target.value);
    console.log(typeof payAmount, " ", payAmount);
    try {
      if (typeof payAmount !== "number" || payAmount === 0) {
        this.setState({ fiatAmount: 0 }, async() => {
          await this.calculateCryptoAmount();
        });
      } else {
        this.setState({ fiatAmount: payAmount }, async() => {
          await this.calculateCryptoAmount();
        });
      }
    } catch (err) {
      this.setState({ fiatAmount: 0 }, async() => {
        await this.calculateCryptoAmount();
      });
    }
  }

  sendSocketIO(msg) {
    console.log(msg);
    socket.emit('event', msg);
    let listen = setInterval(() => {
      axios
        .get(`/api/balance${this.state.cryptoType}/${this.state.pos_address}`)
        .then((res) => {
          if (res.data.utxo.length !== 0) {
            clearInterval(listen);
            this.setState({ utxo: res.data.utxo });
          } else {
            return;
          };
        })}
      , 5000);
    this.setState({ paymentListening: listen }, () => {
      console.log(this.state.paymentListening);
    })
  }

  toggleCryptoType(e) {
    console.log(e.target.value);
    const jsonData = this.state.jsonData;

    if (e.target.value === "BTC" || e.target.value === "BCH" || e.target.value === "ETH") {
      this.setState({ cryptoType: e.target.value, cryptoPrice: jsonData[e.target.value][this.state.fiatType]}, () => {
        console.log(this.state);
        this.calculateCryptoAmount();
      });
    } else if (e.target.value === "USD" || e.target.value === "CAD" || e.target.value === "EUR") {
      this.setState({ fiatType: e.target.value, cryptoPrice: jsonData[this.state.cryptoType][e.target.value]}, () => {
        console.log(this.state);
        this.calculateCryptoAmount();
      })
    }
  }

  updatePrices() {
    axios
      .get('/api/datafeed')
      .then(res => {
        this.setState({ jsonData: res.data.status }, () => {
          console.log(this.state.jsonData);
          this.setState({ cryptoPrice: res.data.status[this.state.cryptoType][this.state.fiatType]}, () => {
            this.calculateCryptoAmount();
          });
        });
      })
      .catch(err => {
        console.log(err);
      })
  }

  render() {
    return(
      <div className="feature-page">
        <Helmet>
          <title>Cashier Page</title>
          <meta
            name="description"
            content="Feature page of React.js Boilerplate application"
          />
        </Helmet>
        <div className="center">
          <h3>Choose payment Option</h3>
          <h4>PoS XPub: {this.state.pos_xpub_address}</h4>
          <li value={this.state.cryptoType} onClick={this.toggleCryptoType}>
            <button class="btn btn-large waves-effect waves-light hoverable blue accent-3" style={{
                    width: "170px",
                    borderRadius: "3px",
                    letterSpacing: "1.5px",
                    marginTop: "5rem" ,
                    textAlign:"center",
                    fontFamily: "font-family: 'Lato', sans-serif;",
                    color:"white",
                    marginRight:"-15px",
                    marginLeft: "28px"
                  }}
                  value="BTC">BTC</button>
            <button class="btn btn-large waves-effect waves-light hoverable blue accent-3" style={{
                    width: "170px",
                    borderRadius: "3px",
                    letterSpacing: "1.5px",
                    marginTop: "5rem" ,
                    textAlign:"center",
                    fontFamily: "font-family: 'Lato', sans-serif;",
                    color:"white",
                    marginRight:"-15px",
                    marginLeft: "28px"
                  }}
                  value="BCH">BCH</button>
            <button class="btn btn-large waves-effect waves-light hoverable blue accent-3" style={{
                    width: "170px",
                    borderRadius: "3px",
                    letterSpacing: "1.5px",
                    marginTop: "5rem" ,
                    textAlign:"center",
                    fontFamily: "font-family: 'Lato', sans-serif;",
                    color:"white",
                    marginRight:"-15px",
                    marginLeft: "28px"
                  }}
                  value="ETH">ETH</button>
          </li>
          <li value={this.state.fiatType} onClick={this.toggleCryptoType}>
            <button class="btn btn-large waves-effect waves-light hoverable blue accent-3" style={{
                    width: "170px",
                    borderRadius: "3px",
                    letterSpacing: "1.5px",
                    marginTop: "5rem" ,
                    textAlign:"center",
                    fontFamily: "font-family: 'Lato', sans-serif;",
                    color:"white",
                    marginRight:"-15px",
                    marginLeft: "28px"
                  }}
                  value="USD">USD</button>
            <button class="btn btn-large waves-effect waves-light hoverable blue accent-3" style={{
                    width: "170px",
                    borderRadius: "3px",
                    letterSpacing: "1.5px",
                    marginTop: "5rem" ,
                    textAlign:"center",
                    fontFamily: "font-family: 'Lato', sans-serif;",
                    color:"white",
                    marginRight:"-15px",
                    marginLeft: "28px"
                  }}
                  value="CAD">CAD</button>
            <button class="btn btn-large waves-effect waves-light hoverable blue accent-3" style={{
                    width: "170px",
                    borderRadius: "3px",
                    letterSpacing: "1.5px",
                    marginTop: "5rem" ,
                    textAlign:"center",
                    fontFamily: "font-family: 'Lato', sans-serif;",
                    color:"white",
                    marginRight:"-15px",
                    marginLeft: "28px"
                  }}
                  value="EUR">EUR</button>
          </li>
          { this.state.url === ''
            ? <QRAddress21 value={defaultWebURL}  />
            : (
              <div>
                <QRAddress21 value={this.state.url} />
              </div>
            )
          }
          <input type="number" placeholder="Enter Payment Amount" min="0" pattern="^\d+(?:\.\d{1,2})?$" onChange={(e) => {this.handleClick(e)}} />
          <button className="btn btn-large waves-effect waves-light hoverable blue accent-3" onClick={() => {this.clearOrder()}} style={{
                width: "170px",
                borderRadius: "3px",
                letterSpacing: "1.5px",
                marginTop: "5rem" ,
                textAlign:"center",
                fontFamily: "font-family: 'Lato', sans-serif;",
                marginRight:"-15px",
                marginLeft: "28px"
              }} >New Order</button>
          <button class="btn btn-large waves-effect waves-light hoverable blue accent-3" style={{
                  width: "170px",
                  borderRadius: "3px",
                  letterSpacing: "1.5px",
                  marginTop: "5rem" ,
                  textAlign:"center",
                  fontFamily: "font-family: 'Lato', sans-serif;",
                  color:"white",
                  marginRight:"-15px",
                  marginLeft: "28px"
                }} onClick={this.updatePrices}>Update Price</button>
          <button class="btn btn-large waves-effect waves-light hoverable blue accent-3" style={{
                  width: "170px",
                  borderRadius: "3px",
                  letterSpacing: "1.5px",
                  marginTop: "5rem" ,
                  textAlign:"center",
                  fontFamily: "font-family: 'Lato', sans-serif;",
                  color:"white",
                  marginRight:"-15px",
                  marginLeft: "28px"
                }}

                  type="button" onClick={() => this.sendSocketIO([this.state.cryptoType, this.state.fiatType, this.state.cryptoAmount, this.state.fiatAmount, this.state.cryptoPrice, this.state.url])}>Pay Now</button>
          <p>$ {this.state.cryptoPrice} {this.state.fiatType} / {this.state.cryptoType}</p>
          <p>{this.state.cryptoAmount} {this.state.cryptoType}</p>
          <p>$ {this.state.fiatAmount} {this.state.fiatType}</p>
        </div>
      </div>
    );
  }
}
