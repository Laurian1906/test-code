import PropTypes from "prop-types";

export default function Layout({ children }) {
  return <div className="min-h-screen bg-[#FAFAFA]">{children}</div>;
}

Layout.propTypes = {
  children: PropTypes.node.isRequired,
};
