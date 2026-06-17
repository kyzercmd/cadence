package handler

import (
	"encoding/json"
	"net/http"

	"github.com/kyzercmd/cadence/internal/models"
	"github.com/kyzercmd/cadence/internal/service"
)

type UserHandler struct {
	userService service.UserService
}

func NewUserHandler(svc service.UserService) *UserHandler {
	return &UserHandler{userService: svc}
}

func (h *UserHandler) CreateEmployee(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var reqUser struct {
		Name      string `json:"name"`
		Email     string `json:"email"`
		Password  string `json:"password"`
		AvatarURL string `json:"avatarUrl"`
		Role      string `json:"role"`
		Position  string `json:"position"`
		Level     string `json:"level"`
		Gender    string `json:"gender"`
		Birthday  string `json:"birthday"`
		Company   string `json:"company"`
		Location  string `json:"location"`
		Mobile    string `json:"mobile"`
		Skype     string `json:"skype"`
	}

	err := json.NewDecoder(r.Body).Decode(&reqUser)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	domainUser := models.User{
		Name:      reqUser.Name,
		Email:     reqUser.Email,
		Password:  reqUser.Password,
		AvatarURL: reqUser.AvatarURL,
		Role:      models.Role(reqUser.Role),
		Position:  reqUser.Position,
		Level:     models.Level(reqUser.Level),
		Gender:    models.Gender(reqUser.Gender),
		Birthday:  reqUser.Birthday,
		Company:   reqUser.Company,
		Location:  reqUser.Location,
		Mobile:    reqUser.Mobile,
		Skype:     reqUser.Skype,
	}

	createdUser, err := h.userService.CreateEmployee(r.Context(), &domainUser)
	if err != nil {
		http.Error(w, "Failed to create Employee", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	json.NewEncoder(w).Encode(createdUser)
}
