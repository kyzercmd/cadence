package handler

import (
	"encoding/json"
	"net/http"

	"github.com/kyzercmd/cadence/internal/service"
)

type StorageHandler struct {
	StorageService service.StorageService
}

func NewStorageHandler(s service.StorageService) *StorageHandler {
	return &StorageHandler{StorageService: s}
}

type UploadResponse struct {
	URL string `json:"url"`
}

// UploadFile godoc
// @Summary      Upload a file
// @Description  Uploads an image or document (max 10MB) to cloud storage and returns the public URL. Use this URL in subsequent JSON payloads for avatars, project images, or attachments.
// @Tags         Storage
// @Accept       multipart/form-data
// @Produce      json
// @Param        file formData file true "The file to upload"
// @Success      200  {object}  UploadResponse "Successfully uploaded file"
// @Failure      400  {string}  string "Invalid file or file too large"
// @Failure      500  {string}  string "Failed to upload file to cloud"
// @Security     BearerAuth
// @Router       /upload [post]
func (h *StorageHandler) UploadFile(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 10<<20)
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		http.Error(w, "File too large. Maximum size is 10MB", http.StatusRequestEntityTooLarge)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "Invalid file payload", http.StatusBadRequest)
		return
	}
	defer file.Close()

	fileURL, err := h.StorageService.UploadFile(r.Context(), file, header)
	if err != nil {
		http.Error(w, "Failed to upload file to cloud", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(UploadResponse{URL: fileURL})
}
