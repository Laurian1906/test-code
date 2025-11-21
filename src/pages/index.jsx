import Layout from "./Layout.jsx";
import Dashboard from "./Dashboard";
import Home from "./Home";
import Login from "./Login.jsx";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";

const PAGES = {
  Home: Home,
  Dashboard: Dashboard,
  Login: Login,
};

function _getCurrentPage(url) {
  if (url.endsWith("/")) {
    url = url.slice(0, -1);
  }
  let urlLastPart = url.split("/").pop();
  if (urlLastPart.includes("?")) {
    urlLastPart = urlLastPart.split("?")[0];
  }

  const pageName = Object.keys(PAGES).find(
    (page) => page.toLowerCase() === urlLastPart.toLowerCase()
  );
  return pageName || "Home";
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
  const location = useLocation();
  const currentPage = _getCurrentPage(location.pathname);

  return (
    <Layout currentPageName={currentPage}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/Login" element={<Login />} />
      </Routes>
    </Layout>
  );
}

export default function Pages() {
  return (
    <Router>
      <PagesContent />
    </Router>
  );
}
