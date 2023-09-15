module.exports = (func) => {
  return (req, res, next) => {
    func(req, res).catch((e) => next(e));
  };
};
