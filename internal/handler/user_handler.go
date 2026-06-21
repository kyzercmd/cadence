package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/kyzercmd/cadence/internal/middleware"
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
	w.WriteHeader(http.StatusCreated)

	json.NewEncoder(w).Encode(createdUser)
}

func (h *UserHandler) UpdateSelf(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDkey).(string)

	var req struct {
		AvatarURL *string `json:"avatarURL"`
		Location  *string `json:"location"`
		Mobile    *string `json:"mobile"`
		Skype     *string `json:"skype"`
	}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request Body", http.StatusBadRequest)
		return
	}

	payload := &models.UserUpdatePayload{
		AvatarURL: req.AvatarURL,
		Location:  req.Location,
		Mobile:    req.Mobile,
		Skype:     req.Skype,
	}

	updatedUser, err := h.userService.UpdateSelfProfile(r.Context(), userID, payload)
	if err != nil {
		http.Error(w, "Failed to update profile", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(updatedUser)
}

func (h *UserHandler) HRUpdateEmployee(w http.ResponseWriter, r *http.Request) {
	targetID := r.PathValue("id")

	var req struct {
		Name      *string        `json:"name"`
		AvatarURL *string        `json:"avatarUrl"`
		Level     *models.Level  `json:"level"`
		Gender    *models.Gender `json:"gender"`
		Birthday  *string        `json:"birthday"`
		Company   *string        `json:"company"`
		Location  *string        `json:"location"`
		Mobile    *string        `json:"mobile"`
		Skype     *string        `json:"skype"`
		Active    *bool          `json:"active"`
	}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	payload := &models.UserUpdatePayload{
		Name:      req.Name,
		AvatarURL: req.AvatarURL,
		Level:     req.Level,
		Gender:    req.Gender,
		Birthday:  req.Birthday,
		Company:   req.Company,
		Location:  req.Location,
		Mobile:    req.Mobile,
		Skype:     req.Skype,
		Active:    req.Active,
	}

	updatedUser, err := h.userService.HRUpdateEmployee(r.Context(), targetID, payload)
	if err != nil {
		http.Error(w, "Failed to update employee", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(updatedUser)
}

func (h *UserHandler) AdminUpdateEmployee(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("id")

	var req struct {
		Name      *string        `json:"name"`
		Email     *string        `json:"email"`
		Password  *string        `json:"password"`
		AvatarURL *string        `json:"avatarUrl"`
		Role      *models.Role   `json:"role"`
		Position  *string        `json:"position"`
		Level     *models.Level  `json:"level"`
		Gender    *models.Gender `json:"gender"`
		Birthday  *string        `json:"birthday"`
		Company   *string        `json:"company"`
		Location  *string        `json:"location"`
		Mobile    *string        `json:"mobile"`
		Skype     *string        `json:"skype"`
		Active    *bool          `json:"active"`
	}

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	payload := &models.UserUpdatePayload{
		Name:      req.Name,
		Email:     req.Email,
		Password:  req.Password,
		AvatarURL: req.AvatarURL,
		Role:      req.Role,
		Position:  req.Position,
		Level:     req.Level,
		Gender:    req.Gender,
		Birthday:  req.Birthday,
		Company:   req.Company,
		Location:  req.Location,
		Mobile:    req.Mobile,
		Skype:     req.Skype,
		Active:    req.Active,
	}

	updatedUser, err := h.userService.AdminUpdateEmployee(r.Context(), userID, payload)
	if err != nil {
		http.Error(w, "Failed to update employee", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(updatedUser)
}

func (h *UserHandler) GetSelf(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDkey).(string)
	user, err := h.userService.GetUserProfile(r.Context(), userID)
	if err != nil {
		if errors.Is(err, models.ErrUserNotFound) {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get user", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (h *UserHandler) GetEmployee(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("id")

	user, err := h.userService.GetUserProfile(r.Context(), userID)
	if err != nil {
		if errors.Is(err, models.ErrUserNotFound) {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to get user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(user)
}
