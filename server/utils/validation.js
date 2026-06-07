export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validateDecimal = (value) => {
  return !isNaN(parseFloat(value)) && isFinite(value);
};

export const validateDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

export const calculateGrossBill = (workDone, cgst, sgst, igst, labourCess) => {
  return (
    parseFloat(workDone || 0) +
    parseFloat(cgst || 0) +
    parseFloat(sgst || 0) +
    parseFloat(igst || 0) +
    parseFloat(labourCess || 0)
  );
};

export const calculateNetLiability = (grossBill, adhocWithheld, cscTemporaryWithheld) => {
  return (
    parseFloat(grossBill || 0) -
    parseFloat(adhocWithheld || 0) -
    parseFloat(cscTemporaryWithheld || 0)
  );
};
