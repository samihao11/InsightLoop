package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
	"github.com/gin-gonic/gin"
	"github.com/gin-contrib/cors"
	"github.com/joho/godotenv"
)

type Note struct {
	ID        string `json:"id"`
	Text      string `json:"text"`
	Timestamp string `json:"timestamp"`
}

type TeamMember struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Role  string `json:"role"`
	Email string `json:"email"`
	Notes []Note `json:"notes"`
}

type TranscriptionRequest struct {
	Transcription string `json:"transcription"`
}

type OpenAIRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenAIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

// Initialize teamMembers as an empty slice
var teamMembers = make([]TeamMember, 0)

func init() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		fmt.Println("Warning: .env file not found")
	}
}

func main() {
	router := gin.Default()

	// Get environment variables
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // default port
	}

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000" // default frontend URL
	}

	// Configure CORS
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{frontendURL}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	config.AllowCredentials = true
	router.Use(cors.New(config))

	// API routes
	router.GET("/api/team-members", getTeamMembers)
	router.POST("/api/team-members", addTeamMember)
	router.PUT("/api/team-members/:id/notes", addNote)
	router.DELETE("/api/team-members/:id", deleteTeamMember)
	router.POST("/api/process-transcription", processTranscription)

	// Start server
	fmt.Printf("Server starting on port %s...\n", port)
	router.Run(":" + port)
}

func getTeamMembers(c *gin.Context) {
	c.JSON(http.StatusOK, teamMembers)
}

func addTeamMember(c *gin.Context) {
	var newMember TeamMember
	if err := c.BindJSON(&newMember); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Initialize notes array if it's nil
	if newMember.Notes == nil {
		newMember.Notes = make([]Note, 0)
	}

	teamMembers = append(teamMembers, newMember)
	c.JSON(http.StatusCreated, newMember)
}

func addNote(c *gin.Context) {
	id := c.Param("id")
	var newNote Note
	if err := c.BindJSON(&newNote); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	for i, member := range teamMembers {
		if member.ID == id {
			// Initialize notes array if it's nil
			if teamMembers[i].Notes == nil {
				teamMembers[i].Notes = make([]Note, 0)
			}
			teamMembers[i].Notes = append(teamMembers[i].Notes, newNote)
			c.JSON(http.StatusOK, teamMembers[i])
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Team member not found"})
}

func deleteTeamMember(c *gin.Context) {
	id := c.Param("id")
	for i, member := range teamMembers {
		if member.ID == id {
			teamMembers = append(teamMembers[:i], teamMembers[i+1:]...)
			c.Status(http.StatusNoContent)
			return
		}
	}

	c.JSON(http.StatusNotFound, gin.H{"error": "Team member not found"})
}

func normalizeName(name string) string {
	// Convert to lowercase and trim spaces
	name = strings.ToLower(strings.TrimSpace(name))
	// Remove any extra spaces between words
	words := strings.Fields(name)
	return strings.Join(words, " ")
}

func processTranscription(c *gin.Context) {
	var req TranscriptionRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get OpenAI API key from environment variable
	apiKey := os.Getenv("OPENAI_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "OpenAI API key not configured"})
		return
	}

	// Create the prompt for OpenAI
	prompt := fmt.Sprintf(`Please analyze this meeting transcription and provide a summary of what each team member contributed. 
The transcription is formatted with each person's name followed by their contributions.
Format your response as a JSON object where each key is a team member's name and the value is their contribution summary.
Only include team members that are mentioned in the transcription.
Keep the summaries concise but include all key points.
Example format:
{
    "Team Member Name": "Summary of their contributions and key points discussed"
}

Transcription:
%s`, req.Transcription)

	// Create OpenAI request body
	openAIReqBody := OpenAIRequest{
		Model: "gpt-4",
		Messages: []Message{
			{
				Role:    "system",
				Content: "You are a helpful assistant that analyzes meeting transcriptions and provides structured summaries of team member contributions. Your response must be a valid JSON object with team member names as keys and their contributions as values. Preserve the exact names as they appear in the transcription.",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	// Convert request to JSON
	jsonData, err := json.Marshal(openAIReqBody)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create OpenAI request"})
		return
	}

	// Create HTTP request to OpenAI
	client := &http.Client{}
	httpReq, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create HTTP request"})
		return
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+apiKey)

	// Send request to OpenAI
	resp, err := client.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to send request to OpenAI"})
		return
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read OpenAI response"})
		return
	}

	// Parse OpenAI response
	var openAIResp OpenAIResponse
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse OpenAI response"})
		return
	}

	// Log the raw response from OpenAI
	fmt.Printf("OpenAI Response: %s\n", openAIResp.Choices[0].Message.Content)

	// Parse the summary JSON from OpenAI's response
	var summaries map[string]string
	if err := json.Unmarshal([]byte(openAIResp.Choices[0].Message.Content), &summaries); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse summaries from OpenAI response"})
		return
	}

	// Log the parsed summaries
	fmt.Printf("Parsed Summaries: %+v\n", summaries)

	// Log current team members
	fmt.Printf("Current Team Members: %+v\n", teamMembers)

	// Update team members' notes
	updated := false
	for name, summary := range summaries {
		fmt.Printf("Processing summary for: %s\n", name)
		normalizedName := normalizeName(name)
		
		// Find team member by name
		for i, member := range teamMembers {
			normalizedMemberName := normalizeName(member.Name)
			fmt.Printf("Comparing '%s' with team member: '%s'\n", normalizedName, normalizedMemberName)
			
			if normalizedMemberName == normalizedName {
				fmt.Printf("Found match for: %s\n", name)
				// Create new note
				newNote := Note{
					ID:        fmt.Sprintf("meeting-%d", len(member.Notes)+1),
					Text:      summary,
					Timestamp: time.Now().Format(time.RFC3339),
				}

				// Initialize notes array if nil
				if teamMembers[i].Notes == nil {
					teamMembers[i].Notes = make([]Note, 0)
				}

				// Add note
				teamMembers[i].Notes = append(teamMembers[i].Notes, newNote)
				updated = true
				fmt.Printf("Added note for: %s\n", name)
				break
			}
		}
	}

	if !updated {
		c.JSON(http.StatusOK, gin.H{"message": "No matching team members found in the transcription"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Successfully processed transcription and updated team member notes"})
}
