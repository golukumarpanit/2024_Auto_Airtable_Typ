/* <script> */
const API_KEY = 'AIzaSyA2UyAU-6qR-nwwfauzdFG-CxhpVSSh8yw';
const SPREADSHEET_ID = '1q9KL8CBHjPuhPohyTcGp9wk68VxkJ6OT8DZrRctwRyI';
const SHEET_NAME = 'Sheet2';

let cropper, qr;

// Convert Column Number → Letter
function columnToLetter(column) {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}

// Main function
async function fetchFullData() {
  const roll = document.getElementById("idInput").value.trim();
  const message = document.getElementById("message");
  const errorMsg = document.getElementById("errorMsg");

  if (!roll) {
    message.innerText = "⚠️ कृपया रोल या MS नंबर दर्ज करें!";
    return;
  }

  // 📌 पहले CACHE चेक करो
  const cached = sessionStorage.getItem(`roll_${roll}`);
  if (cached) {
    const fields = JSON.parse(cached);
    displayFields(fields);
    displayPhotoAndQR(fields);
    message.innerText = "✅ Cached Data लोड हुआ";
    return;
  }

  message.innerText = "⏳ डेटा लोड हो रहा है...";
  errorMsg.innerText = "";

  try {
    // Get Sheet Size
    const sheetPropsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets(properties(title,gridProperties))&key=${API_KEY}`;
    const propsRes = await fetch(sheetPropsUrl);
    const propsData = await propsRes.json();
    const sheet = propsData.sheets.find(s => s.properties.title === SHEET_NAME);
    const rowCount = sheet.properties.gridProperties.rowCount;
    const colCount = sheet.properties.gridProperties.columnCount;

    const lastColumn = columnToLetter(colCount);
    const fullRange = `${SHEET_NAME}!A1:${lastColumn}${rowCount}`;

    // Fetch all sheet values
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${fullRange}?key=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const rows = data.values;
    const headers = rows[0];

    // Column indexes
    const rollIndex = headers.indexOf("ROLL_NUB");
    const msIndex = headers.indexOf("Ms_Nub");

    // DUAL SEARCH → Roll or MS दोनों से
    const record = rows.find((row, i) =>
      i > 0 && (
        (row[rollIndex] && row[rollIndex].trim().toLowerCase() === roll.toLowerCase()) ||
        (row[msIndex] && row[msIndex].trim().toLowerCase() === roll.toLowerCase())
      )
    );

    // Not Found
    if (!record) {
      errorMsg.innerText = "❌ रिकॉर्ड नहीं मिला!";
      message.innerText = "";
      return;
    }

    // Map fields
    const fields = {};
    headers.forEach((h, i) => fields[h] = record[i] || "N/A");

    // Cache save
    sessionStorage.setItem(`roll_${roll}`, JSON.stringify(fields));

    // Display Data
    displayFields(fields);
    displayPhotoAndQR(fields);

    message.innerText = "✅ डेटा सफलतापूर्वक लोड हुआ!";

  } catch (err) {
    console.error("Fetch Error:", err);
    errorMsg.innerText = "⚠️ डेटा लाने में त्रुटि!";
    message.innerText = "";
  }
}

// Display Fields
function displayFields(fields) {
  document.getElementById("RollNubid").innerText = fields['ROLL_NUB'];
  document.getElementById("studentName").innerText = fields['NAME'];
  document.getElementById("fatherName").innerText = fields['FATHERS_NAME'];
  document.getElementById("DOBfatch").innerText = fields['DOB'];

  // COURSE
  document.getElementById("courseName").innerText = fields['SELECT_COURSE'];

  // Duration Logic
  let duration = "";
  if (fields['SELECT_COURSE'] === "Diploma in Computer Application") duration = "SIX";
  else if (fields['SELECT_COURSE'] === "Advance Diploma in Computer Application") duration = "TWELVE";

  document.getElementById("selectedDuration").innerText = duration;

  // MS Number (QR Code)
  document.getElementById("qrc").innerText = fields['Ms_Nub'];

  // Page Title Update
  document.title = fields['ROLL_NUB'];
}

// Photo + QR Generate
function displayPhotoAndQR(fields) {
  const qrText = `
    Certificate No: ${fields['Ms_Nub']}
    Roll No: ${fields['ROLL_NUB']}
    Name: ${fields['NAME']}
    Father's Name: ${fields['FATHERS_NAME']}
    DOB: ${fields['DOB']}
    Course: ${fields['SELECT_COURSE']}
  `;

  qr.clear();
  qr.makeCode(qrText);

  // PHOTO
  const photoElement = document.getElementById("previewImage");
  const photopreview = document.getElementById("croppedImage");
  let rawLink = fields['photourl'];

  if (!rawLink) return;

  let fileId = (rawLink.match(/\/d\/([a-zA-Z0-9_-]+)/) || [])[1];
  if (!fileId) {
    let m = rawLink.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) fileId = m[1];
  }

  if (!fileId) return;

  const imageUrl = `https://lh3.googleusercontent.com/d/${fileId}=s800`;
  photoElement.src = imageUrl;
  photopreview.src = imageUrl;

  photoElement.style.display = "block";
  photopreview.style.display = "block";

  if (cropper) cropper.destroy();
  cropper = new Cropper(photoElement, {
    viewMode: 1,
    autoCropArea: 0.8,
    crop() {
      const canvas = cropper.getCroppedCanvas({ width: 200, height: 200 });
      photopreview.src = canvas.toDataURL();
    }
  });
}

// Page Load
window.addEventListener("load", () => {
  qr = new QRCode(document.getElementById("qrcode"), {
    text: "QR will update after data load",
    width: 200,
    height: 200
  });

  const param = new URLSearchParams(window.location.search);
  const roll = param.get("roll");
  if (roll) {
    document.getElementById("idInput").value = roll;
    fetchFullData();
  }
});
/* </script> */
