const Campground = require("../models/campground");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapboxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapboxToken });
const { cloudinary } = require("../cloudinary");

module.exports.index = async (req, res) => {
  const campgrounds = await Campground.find({});
  res.render("campgrounds/index", { campgrounds });
};

module.exports.renderNewForm = (req, res) => {
  res.render("campgrounds/new");
};

module.exports.createCampground = async (req, res) => {
  const geoData = await geocoder
    .forwardGeocode({
      query: req.body.campground.location,
      limit: 1,
    })
    .send();

  const images = req.files.map((f) => ({
    url: f.path,
    filename: f.filename,
  }));

  const campground = await Campground.create({
    ...req.body.campground,
    geometry: geoData.body.features[0].geometry,
    author: req.user._id,
    images,
  });

  console.log(campground);
  req.flash("success", "Successfully made a new campground!");
  res.redirect(`/campgrounds/${campground._id}`);
};

module.exports.renderEditForm = async (req, res) => {
  const campground = await Campground.findById(req.params.id);
  if (!campground) {
    req.flash("error", "Cannot find that campground!");
    return res.redirect("/campgrounds");
  }
  res.render("campgrounds/edit", { campground });
};

module.exports.updateCampground = async (req, res) => {
  const geoData = await geocoder
    .forwardGeocode({
      query: req.body.campground.location,
      limit: 1,
    })
    .send();
  const id = req.params.id;
  const data = {
    ...req.body.campground,
    geometry: geoData.body.features[0].geometry,
  };
  console.log(req.body);
  const campground = await Campground.findByIdAndUpdate(id, data, {
    runValidators: true,
    new: true,
  });
  const images = req.files.map((f) => ({
    url: f.path,
    filename: f.filename,
  }));
  campground.images.push(...images);

  // Deleteing images from the Mongo DB
  if (req.body.deleteImages) {
    for (let filename of req.body.deleteImages) {
      await cloudinary.uploader.destroy(filename);
    }
    await campground.updateOne({
      $pull: { images: { filename: { $in: req.body.deleteImages } } },
    });
  }

  await campground.save();
  req.flash("success", "Successfully edited campground!");
  res.redirect(`/campgrounds/${campground._id}`);
};

module.exports.deleteCampground = async (req, res) => {
  const campground = await Campground.findByIdAndDelete(req.params.id);
  req.flash("success", "Successfully deleted campground!");
  res.redirect("/campgrounds");
};

module.exports.showCampground = async (req, res) => {
  const campground = await Campground.findById(req.params.id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("author");
  if (!campground) {
    req.flash("error", "Cannot find that campground!");
    return res.redirect("/campgrounds");
  }
  res.render("campgrounds/show", { campground });
};
