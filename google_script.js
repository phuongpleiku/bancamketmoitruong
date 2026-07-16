/**
 * Google Apps Script để nhận dữ liệu từ Form Cam Kết Du Lịch Pleiku
 * Hướng dẫn sử dụng chi tiết tại file: huong_dan_ket_noi.md
 */

function doPost(e) {
  // Khóa script để tránh trùng lặp khi nhiều người gửi cùng lúc
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Đợi tối đa 10 giây
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": "Hệ thống đang bận, vui lòng thử lại sau."
    }))
    .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    // 1. Mở Spreadsheet đang hoạt động
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName("CamKet");
    
    // Nếu sheet tên "CamKet" chưa tồn tại, tạo mới
    if (!sheet) {
      sheet = doc.insertSheet("CamKet");
    }
    
    // 2. Định nghĩa cấu trúc cột dữ liệu (Cập nhật cột Biên bản PDF)
    var headersRow = [
      "Thời gian đăng ký",
      "Tên cơ sở kinh doanh",
      "Loại hình kinh doanh",
      "Người đại diện",
      "Số điện thoại",
      "Địa chỉ",
      "Cam kết 3K",
      "Cam kết 3A",
      "Họ tên người ký",
      "Chữ ký hình ảnh (Xem trực tiếp)",
      "Biên bản PDF (Drive Link)"
    ];
    
    // Nếu Sheet chưa có dữ liệu, ghi hàng tiêu đề đầu tiên
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headersRow);
      // Format hàng tiêu đề cho đẹp
      sheet.getRange(1, 1, 1, headersRow.length)
           .setFontWeight("bold")
           .setBackground("#b31d1d")
           .setFontColor("#ffffff")
           .setHorizontalAlignment("center");
      sheet.setFrozenRows(1);
    }
    
    var businessName = e.parameter.BusinessName || "Co_So_Kinh_Doanh";
    var cleanBizName = businessName.replace(/[^a-z0-9]/gi, '_');
    var timestamp = new Date();
    var timestampStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), "dd-MM-yyyy_HH-mm-ss");

    // 3. Xử lý lưu chữ ký hình ảnh vào Google Drive làm file tạm
    var signatureFormula = "";
    if (e.parameter.Signature && e.parameter.Signature.indexOf("data:image/png;base64,") === 0) {
      try {
        var base64SigData = e.parameter.Signature.replace("data:image/png;base64,", "");
        var decodedSig = Utilities.base64Decode(base64SigData);
        var sigBlob = Utilities.newBlob(decodedSig, "image/png", "Signature_" + cleanBizName + "_" + timestampStr + ".png");
        
        // Tìm hoặc tạo thư mục lưu chữ ký tạm thời
        var sigFolderName = "Chữ ký Cam kết Du lịch Pleiku (Temp)";
        var sigFolders = DriveApp.getFoldersByName(sigFolderName);
        var sigFolder;
        if (sigFolders.hasNext()) {
          sigFolder = sigFolders.next();
        } else {
          sigFolder = DriveApp.createFolder(sigFolderName);
        }
        
        var sigFile = sigFolder.createFile(sigBlob);
        sigFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        // Sử dụng ID file Drive để hiển thị ảnh trực tiếp trong ô Google Sheet
        var fileId = sigFile.getId();
        var directImageUrl = "https://lh3.googleusercontent.com/d/" + fileId;
        signatureFormula = '=IMAGE("' + directImageUrl + '"; 2)';
      } catch (driveError) {
        signatureFormula = "Không thể tải ảnh chữ ký: " + driveError.toString();
      }
    }
    
    // 4. Xử lý lưu file BIÊN BẢN PDF vào Folder được chỉ định
    var pdfUrl = "Chưa thiết lập";
    if (e.parameter.PdfFile) {
      try {
        var base64PdfData = e.parameter.PdfFile;
        var decodedPdf = Utilities.base64Decode(base64PdfData);
        var pdfBlob = Utilities.newBlob(decodedPdf, "application/pdf", "CamKetDuLich_" + cleanBizName + "_" + timestampStr + ".pdf");
        
        // ID Thư mục được chỉ định: 1OCXSHASG_ijIW2qKyJzvMCKs90t0yASb
        var targetFolderId = "1OCXSHASG_ijIW2qKyJzvMCKs90t0yASb";
        var folder;
        try {
          folder = DriveApp.getFolderById(targetFolderId);
        } catch (folderErr) {
          // Fallback nếu không tìm thấy ID thư mục được chỉ định (tạo thư mục dự phòng)
          var fallbackFolderName = "Biên Bản Cam Kết Du Lịch Pleiku (Fallback)";
          var fallbackFolders = DriveApp.getFoldersByName(fallbackFolderName);
          if (fallbackFolders.hasNext()) {
            folder = fallbackFolders.next();
          } else {
            folder = DriveApp.createFolder(fallbackFolderName);
          }
        }
        
        // Tạo file PDF trong thư mục đích
        var pdfFile = folder.createFile(pdfBlob);
        // Thiết lập quyền cho phép ai có link cũng có thể xem
        pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        pdfUrl = pdfFile.getUrl();
      } catch (pdfError) {
        pdfUrl = "Lỗi lưu PDF: " + pdfError.toString();
      }
    }
    
    // 5. Lấy dữ liệu văn bản từ Form
    var businessType = e.parameter.BusinessType || "";
    var representative = e.parameter.Representative || "";
    var phone = e.parameter.Phone || "";
    var address = e.parameter.Address || "";
    var signeeName = e.parameter.SigneeName || "";
    
    // Điền trạng thái cam kết dựa trên các checkbox
    var kStatus = (e.parameter.K1_KhongNangGia === "on" && e.parameter.K2_KhongCheoKeo === "on" && e.parameter.K3_KhongONhiem === "on") ? "Đã cam kết 3K" : "Chưa đủ";
    var aStatus = (e.parameter.A1_AnToanGiaoThong === "on" && e.parameter.A2_AnToanVeSinh === "on" && e.parameter.A3_AnToanTinhMang === "on") ? "Đã cam kết 3A" : "Chưa đủ";

    // 6. Thêm dòng dữ liệu mới vào sheet
    var nextRow = sheet.getLastRow() + 1;
    
    sheet.appendRow([
      timestamp,
      businessName,
      businessType,
      representative,
      "'" + phone, // Thêm dấu nháy đơn để số điện thoại không bị mất số 0 đầu
      address,
      kStatus,
      aStatus,
      signeeName,
      "", // Ô chữ ký hình ảnh sẽ ghi đè công thức ở bước sau
      pdfUrl
    ]);
    
    // Set công thức hiển thị ảnh chữ ký và format chiều cao dòng
    if (signatureFormula && signatureFormula.indexOf('=IMAGE') === 0) {
      sheet.getRange(nextRow, 10).setFormula(signatureFormula);
      sheet.setRowHeight(nextRow, 60); // Đặt chiều cao dòng 60px để hiển thị rõ chữ ký
    } else if (signatureFormula) {
      sheet.getRange(nextRow, 10).setValue(signatureFormula);
    }
    
    // Format căn giữa các cột trạng thái và link
    sheet.getRange(nextRow, 7, 1, 5).setHorizontalAlignment("center");
    
    // Trả về kết quả thành công cho frontend
    return ContentService.createTextOutput(JSON.stringify({
      "status": "success",
      "row": nextRow,
      "pdfUrl": pdfUrl,
      "message": "Dữ liệu và file PDF đã được lưu thành công!"
    }))
    .setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    // Trả về lỗi nếu có sự cố xảy ra
    return ContentService.createTextOutput(JSON.stringify({
      "status": "error",
      "message": err.toString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
    
  } finally {
    // Giải phóng khóa script
    lock.releaseLock();
  }
}

// Xử lý request GET để kiểm tra trạng thái hoặc tìm kiếm dữ liệu (Hỗ trợ JSONP vượt CORS)
function doGet(e) {
  var callback = e.parameter.callback;
  var action = e.parameter.action;
  
  // Hàm bổ trợ trả về JSON hoặc JSONP tùy theo request
  function outputJson(data) {
    var jsonString = JSON.stringify(data);
    if (callback) {
      return ContentService.createTextOutput(callback + "(" + jsonString + ")")
        .setMimeType(ContentService.MimeType.JAVASCRIPT);
    } else {
      return ContentService.createTextOutput(jsonString)
        .setMimeType(ContentService.MimeType.JSON);
      }
  }
  
  if (action === "search") {
    try {
      var phoneToSearch = e.parameter.phone;
      if (!phoneToSearch) {
        return outputJson({
          "status": "error",
          "message": "Thiếu tham số số điện thoại."
        });
      }
      
      var cleanSearchPhone = phoneToSearch.trim().replace(/\s+/g, "");
      
      var doc = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = doc.getSheetByName("CamKet");
      
      if (!sheet) {
        return outputJson({
          "status": "not_found",
          "message": "Chưa có dữ liệu cam kết nào trong hệ thống."
        });
      }
      
      var lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return outputJson({
          "status": "not_found",
          "message": "Chưa có dữ liệu cam kết nào."
        });
      }
      
      // Đọc toàn bộ dữ liệu từ Sheet (bỏ hàng tiêu đề)
      var dataRange = sheet.getRange(2, 1, lastRow - 1, 11);
      var values = dataRange.getValues();
      var matches = [];
      
      for (var i = 0; i < values.length; i++) {
        var row = values[i];
        // Làm sạch số điện thoại từ Sheet (bỏ khoảng trắng và dấu nháy đơn)
        var rowPhone = String(row[4]).trim().replace(/'/g, "").replace(/\s+/g, "");
        
        if (rowPhone === cleanSearchPhone) {
          var formattedDate = "";
          try {
            var dateVal = row[0]; // Cột 1 là Timestamp
            if (dateVal instanceof Date) {
              var dd = String(dateVal.getDate()).padStart(2, '0');
              var mm = String(dateVal.getMonth() + 1).padStart(2, '0');
              var yyyy = dateVal.getFullYear();
              var hh = String(dateVal.getHours()).padStart(2, '0');
              var min = String(dateVal.getMinutes()).padStart(2, '0');
              formattedDate = hh + ":" + min + " " + dd + "/" + mm + "/" + yyyy;
            } else {
              formattedDate = String(dateVal);
            }
          } catch(e) {
            formattedDate = String(row[0]);
          }
          
          matches.push({
            "businessName": row[1],
            "businessType": row[2],
            "representative": row[3],
            "date": formattedDate,
            "signeeName": row[8],
            "pdfUrl": row[10] // Cột 11 là link PDF
          });
        }
      }
      
      // Đảo chiều để cam kết mới nhất xuất hiện trước
      matches.reverse();
      
      if (matches.length > 0) {
        return outputJson({
          "status": "success",
          "data": matches
        });
      } else {
        return outputJson({
          "status": "not_found",
          "message": "Không tìm thấy cam kết nào liên kết với số điện thoại này."
        });
      }
    } catch(err) {
      return outputJson({
        "status": "error",
        "message": err.toString()
      });
    }
  }
  
  // Trạng thái hoạt động mặc định
  return outputJson({
    "status": "active",
    "message": "Dịch vụ tiếp nhận cam kết du lịch UBND Pleiku đang hoạt động tốt."
  });
}
