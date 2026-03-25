try {
  const pseudoTimestamp = { seconds: 1715814000, nanoseconds: 0 };
  console.log("Pseudo Timestamp:", pseudoTimestamp);
  const date = new Date(pseudoTimestamp);
  console.log("Date object:", date.toString());
  console.log("Trying toISOString()...");
  console.log(date.toISOString());
} catch (e) {
  console.error("CAUGHT ERROR:", e.message);
}
