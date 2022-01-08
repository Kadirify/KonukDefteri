// async route'larda try/catch yazmamak için
function sar(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { sar };
