using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace IELTS.AI.Evaluator.Functions.DTOs
{

    public class UserUpsertRequestDto
    {
        [JsonPropertyName("userId")]
        public Guid? UserId { get; set; }

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("fullName")]
        public string FullName { get; set; } = string.Empty;

        [JsonPropertyName("authProvider")]
        public string AuthProvider { get; set; } = "Email";

        [JsonPropertyName("plan")]
        public string Plan { get; set; } = "Free";

        [JsonPropertyName("writingQuotaUsed")]
        public int WritingQuotaUsed { get; set; }

        [JsonPropertyName("speakingQuotaUsed")]
        public int SpeakingQuotaUsed { get; set; }

        [JsonPropertyName("ieltsTargetType")]
        public string IELTSTargetType { get; set; } = "General Training";

        [JsonPropertyName("ieltsTargetScore")]
        public decimal IELTSTargetScore { get; set; }

        [JsonPropertyName("targetTestDate")]
        public DateTime TargetTestDate { get; set; }

        [JsonPropertyName("dateTimeOffset")]
        public int? DateTimeOffset{ get; set; }
    }

    public class UserResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public UserDto? Data { get; set; }
    }

    public class UserListResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public List<UserDto> Data { get; set; } = new();
    }

    public class UserDto
    {
        [JsonPropertyName("userId")]
        public Guid UserId { get; set; }

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("fullName")]
        public string FullName { get; set; } = string.Empty;

        [JsonPropertyName("authProvider")]
        public string AuthProvider { get; set; } = "Email";

        [JsonPropertyName("plan")]
        public string Plan { get; set; } = "Free";

        [JsonPropertyName("writingQuotaUsed")]
        public int WritingQuotaUsed { get; set; }

        [JsonPropertyName("speakingQuotaUsed")]
        public int SpeakingQuotaUsed { get; set; }

        [JsonPropertyName("ieltsTargetType")]
        public string IELTSTargetType { get; set; } = "General Training";

        [JsonPropertyName("ieltsTargetScore")]
        public decimal IELTSTargetScore { get; set; }

        [JsonPropertyName("targetTestDate")]
        public DateTimeOffset TargetTestDate { get; set; }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("updatedAt")]
        public DateTime UpdatedAt { get; set; }

        [JsonPropertyName("ClaimsUpdated")]
        public bool? ClaimsUpdated { get; set; }


        [JsonPropertyName("isDeleted")]
        public bool IsDeleted { get; set; }
    }
}