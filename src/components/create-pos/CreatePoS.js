import React, { Component } from "react";
import axios from "axios";
import { connect } from "react-redux";
import M from "materialize-css";

class CreatePoS extends Component {

    constructor() {
        super();

        this.state = {
            pos_name: "",
            pos_xpub: ""
        };
    }

    componentDidMount() {
        M.FormSelect.init(this.select);
    }

    onChange = (event) => {
        this.setState({ [event.target.id]: event.target.value });
    }

    onSubmit = (event) => {
        event.preventDefault();

        const xpub_data = {
            address: this.state.pos_xpub,
            type: this.state.pos_xpub_type
        };

        axios.post("/api/add-xpub", xpub_data).then((res) => {
            const pos_data = {
                user_id: this.props.auth.user.id,
                name: this.state.pos_name,
                xpub: res.data._id
            };

            axios.post("/api/add-pos", pos_data).then((res) => {
                this.props.history.push('/dashboard');
            });
        });
    }

    render() {
        return(
            <div className="container">
                <div className="row" style={{ marginTop: "4rem" }}>
                    <div className="col s8 offset-s2">
                        <div className="col s12">
                            <h4 className="page-header">
                                Create a New Point-of-Sale
                            </h4>
                        </div>

                        <form noValidate onSubmit={this.onSubmit}>
                            <div className="input-field col s12">
                                <input id="pos_name" type="text"
                                        onChange={ this.onChange }
                                        value={ this.state.value }/>
                                <label htmlFor="pos_name">Point-of-sale name</label>
                            </div>

                            <div className="input-field col s12">
                                <select id="pos_xpub_type" defaultValue=""
                                        onChange={ this.onChange }
                                        value={ this.state.value }
                                        ref={ (select) => this.select = select }>
                                    <option value="">Choose a payment currency</option>
                                    <option value="BTC">Bitcoin</option>
                                    <option value="BCH">Bitcoin Cash</option>
                                    <option value="ETH">Ethereum</option>
                                </select>
                            </div>

                            <div className="input-field col s12">
                                <input id="pos_xpub" type="text"
                                        onChange={ this.onChange }
                                        value={ this.state.value } />
                                <label htmlFor="pos_xpub">
                                    Wallet xPub Address
                                </label>
                            </div>

                            <div className="col s12"
                                    style={{ paddingLeft: "10px" }}>
                                <button
                                style={{
                                    width: "165px",
                                    borderRadius: "3px",
                                    letterSpacing: "1.5px",
                                    marginTop: "1rem"
                                }}
                                type="submit"
                                className="btn btn-large waves-effect waves-light
                                        hoverable blue accent-3">Create PoS</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

}

const mapStateToProps = state => ({
    auth: state.auth
});

export default connect(mapStateToProps)(CreatePoS);
