import { Link } from "react-router-dom";
import { useContext } from "react";
import UserContext from "../contexts/UserContext";
import "../styles/Home.css";

export default function Home() {
  const { currentUser } = useContext(UserContext);

  return (
    <div className="Home">
      <h1 className="Home-title">Welcome to ProPulse!</h1>
      <h2 className="Home-msg">Your hub for project communication</h2>
      {currentUser && (
        <h3 className="Home-msg">{`Welcome ${currentUser.firstName}!`}</h3>
      )}
      {currentUser && (
        <h4 className="Home-msg">
          Head to the{" "}
          <Link
            className="Home-msg-link"
            to={`/users/dashboard/${currentUser.id}`}
          >
            Dashboard
          </Link>
        </h4>
      )}
      {!currentUser && (
        <h3 className="Home-msg">
          Please{" "}
          <Link className="Home-msg-link" to="/signup">
            sign up
          </Link>{" "}
          or{" "}
          <Link className="Home-msg-link" to="/login">
            login
          </Link>{" "}
          to use our service.
        </h3>
      )}
      <p className="Home-text">
        Keep your finger on the pulse of your next project!
      </p>
      <p className="Home-text">
        Accessible, lightweight communication for you and your team.
      </p>
    </div>
  );
}
