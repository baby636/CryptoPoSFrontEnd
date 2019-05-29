import React, { Component } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { logoutUser } from "../../actions/authActions";
import { Link } from "react-router-dom";
import axios from "axios";

import './style.scss';

class Dashboard extends Component {

  constructor() {
    super();

    this.state = {
      user_pos_systems: []
    };
  }

  componentDidMount() {
    const user_data = {
      user_id: this.props.auth.user.id
    };

    axios.post("/api/get-all-user-pos", user_data).then((res) => {
      this.setState({ user_pos_systems: res.data });
    });
  }

  onLogoutClick = e => {
    e.preventDefault();
    this.props.logoutUser();
  };

  render() {
    return (
      <div style={{ height: "75vh" }} className="container ">
        <div className="row">
          <div className="landing-copy col s12 center-align">
            <button
              style={{
                width: "150px",
                borderRadius: "3px",
                letterSpacing: "1.5px",
                marginTop: "1rem",
                margin: '14px'
              }}
              onClick={this.onLogoutClick}
              className="btn btn-large waves-effect waves-light hoverable blue accent-3"
            >
              Logout
            </button>
          </div>
          <div className="col s12">
            <hr/>
          </div>
          <div className="s12 center-align">
            <Link
              to = "/create-pos"
              style={{
                width: "210px",
                borderRadius: "3px",
                letterSpacing: "1.5px",
                marginTop: "1rem",
                margin: '14px'
              }}
              className="btn btn-large waves-effect waves-light hoverable blue accent-3"
            >
              Create New PoS
            </Link>
          </div>
          
          <div className="col s4 offset-s4 center-align" id="pos_list">
            {
              this.state.user_pos_systems.map((pos, i) =>
                  <Link to={{ pathname: "/pos-dashboard", query: pos._id }}
                      className="btn btn-large waves-effect waves-light hoverable
                        green accent-3"
                      style={{
                        margin: '14px'
                      }}
                      key={i}>{pos.name}</Link>
              )
            }
          </div>
        </div>
      </div>
    );
  }

}

Dashboard.propTypes = {
  logoutUser: PropTypes.func.isRequired,
  auth: PropTypes.object.isRequired
};

const mapStateToProps = state => ({
  auth: state.auth
});

export default connect(
  mapStateToProps,
  { logoutUser }
)(Dashboard);
