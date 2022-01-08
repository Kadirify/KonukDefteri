function dogrula(sema, kaynak = 'body') {
  return (req, res, next) => {
    const { error, value } = sema.validate(req[kaynak], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) return next(error);
    req[kaynak] = value;
    return next();
  };
}

module.exports = { dogrula };
