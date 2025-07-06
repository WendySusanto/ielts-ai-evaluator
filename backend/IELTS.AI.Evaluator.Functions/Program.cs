using IELTS.AI.Evaluator.Data.Models;
using Microsoft.Azure.Functions.Worker.Builder;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

var builder = FunctionsApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetValue<string>("DbConnectionString");

builder.ConfigureFunctionsWebApplication();

builder.Services.AddDbContext<EvaluatorDbContext>(options => options.UseNpgsql(connectionString));

// Application Insights isn't enabled by default. See https://aka.ms/AAt8mw4.
// builder.Services
//     .AddApplicationInsightsTelemetryWorkerService()
//     .ConfigureFunctionsApplicationInsights();

builder.Build().Run();
