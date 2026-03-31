// Mock all lucide-react-native icons as simple strings for testing
const handler = {
  get(_, name) {
    if (name === '__esModule') return true;
    return name;
  },
};

module.exports = new Proxy({}, handler);
