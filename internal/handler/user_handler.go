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

// CreateEmployee godoc
// @Summary      Create a new employee
// @Description  Creates a new employee record in the system. Requires Admin privileges.
// @Tags         Users
// @Accept       json
// @Produce      json
// @Param        payload body models.CreateUserPayload true "Employee creation payload"
// @Success      201  {object}  models.User "Successfully created employee"
// @Failure      400  {string}  string "Invalid request body"
// @Failure      405  {string}  string "Method not allowed"
// @Failure      500  {string}  string "Failed to create Employee"
// @Security     BearerAuth
// @Router       /admin/employee [post]
func (h *UserHandler) CreateEmployee(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var reqUser models.CreateUserPayload

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

// UpdateSelf godoc
// @Summary      Update own profile
// @Description  Allows the authenticated user to update their own avatar, location, mobile, or skype.
// @Tags         Users
// @Accept       json
// @Produce      json
// @Param        payload body models.UpdateSelfPayload true "Profile update fields"
// @Success      200  {object}  models.User "Updated user profile"
// @Failure      400  {string}  string "Invalid request Body"
// @Failure      500  {string}  string "Failed to update profile"
// @Security     BearerAuth
// @Router       /users/me [patch]
func (h *UserHandler) UpdateSelf(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value(middleware.UserIDkey).(string)

	var req models.UpdateSelfPayload

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

// HRUpdateEmployee godoc
// @Summary      Update employee (HR)
// @Description  Allows HR to update specific employee details. (Role, Email, Password, Position are excluded).
// @Tags         Users
// @Accept       json
// @Produce      json
// @Param        id   path      string  true  "Employee User ID"
// @Param        payload body models.HRUpdateEmployeePayload true "Employee update fields"
// @Success      200  {object}  models.User "Updated user profile"
// @Failure      400  {string}  string "Invalid request body"
// @Failure      500  {string}  string "Failed to update employee"
// @Security     BearerAuth
// @Router       /users/{targetid} [patch]
func (h *UserHandler) HRUpdateEmployee(w http.ResponseWriter, r *http.Request) {
	targetID := r.PathValue("targetid")

	var req *models.HRUpdateEmployeePayload

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

// AdminUpdateEmployee godoc
// @Summary      Update employee (Admin)
// @Description  Allows Admins to update all employee details including Role, Email, Position, and Password.
// @Tags         Users
// @Accept       json
// @Produce      json
// @Param        id   path      string  true  "Employee User ID"
// @Param        payload body models.UserUpdatePayload true "Employee update fields"
// @Success      200  {object}  models.User "Updated user profile"
// @Failure      400  {string}  string "Invalid request body"
// @Failure      500  {string}  string "Failed to update employee"
// @Security     BearerAuth
// @Router       /admin/users/{targetid} [patch]
func (h *UserHandler) AdminUpdateEmployee(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("targetid")

	var req models.UserUpdatePayload

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

// GetSelf godoc
// @Summary      Get current user profile
// @Description  Fetches the profile details of the currently authenticated user.
// @Tags         Users
// @Accept       json
// @Produce      json
// @Success      200  {object}  models.User "User profile data"
// @Failure      401  {string}  string "Unauthorized"
// @Failure      404  {string}  string "User not found"
// @Failure      500  {string}  string "Failed to get user"
// @Security     BearerAuth
// @Router       /users/me [get]
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

// GetEmployee godoc
// @Summary      Get a specific employee
// @Description  Fetches the profile details of a specific employee by ID. Requires HR or Admin privileges.
// @Tags         Users
// @Accept       json
// @Produce      json
// @Param        id   path      string  true  "Employee User ID"
// @Success      200  {object}  models.User "User profile data"
// @Failure      401  {string}  string "Unauthorized"
// @Failure      403  {string}  string "Forbidden"
// @Failure      404  {string}  string "User not found"
// @Failure      500  {string}  string "Failed to get user"
// @Security     BearerAuth
// @Router       /users/{targetid} [get]
func (h *UserHandler) GetEmployee(w http.ResponseWriter, r *http.Request) {
	userID := r.PathValue("targetid")

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

// GetAllEmployee godoc
// @Summary      List all employees
// @Description  Fetches a list of all employees in the system. Requires HR or Admin privileges.
// @Tags         Users
// @Accept       json
// @Produce      json
// @Success      200  {array}   models.UserListResponse "List of employees"
// @Failure      401  {string}  string "Unauthorized"
// @Failure      403  {string}  string "Forbidden"
// @Failure      500  {string}  string "Failed to fetch employees"
// @Security     BearerAuth
// @Router       /users [get]
func (h *UserHandler) GetAllEmployee(w http.ResponseWriter, r *http.Request) {
	users, err := h.userService.GetAllEmployees(r.Context())
	if err != nil {
		http.Error(w, "Failed to fetch employees", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	json.NewEncoder(w).Encode(users)
}
