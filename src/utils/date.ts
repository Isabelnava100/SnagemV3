const options: Intl.DateTimeFormatOptions = {
  month: "long",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hour12: false,
};

const formatter = new Intl.DateTimeFormat("en-US", options);

export default formatter;
