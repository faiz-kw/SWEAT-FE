using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Sweat.EdgeService.Services;

namespace Sweat.EdgeService;

public class Program
{
    public static async Task Main(string[] args)
    {
        var builder = Host.CreateDefaultBuilder(args)
            .UseWindowsService(options =>
            {
                options.ServiceName = "SWEAT Edge Turnstile Service";
            })
            .ConfigureServices((hostContext, services) =>
            {
                // Register Core SQLite Database Service
                services.AddSingleton<DatabaseService>();

                // Register Background Workers
                services.AddHostedService<TurnstileWorker>();
                services.AddHostedService<CloudSyncWorker>();
            })
            .ConfigureLogging((hostContext, logging) =>
            {
                logging.ClearProviders();
                logging.AddConsole();
                logging.AddEventLog(eventLogSettings =>
                {
                    eventLogSettings.SourceName = "SWEAT.EdgeService";
                });
            });

        var host = builder.Build();

        // Ensure database is initialized before workers start
        host.Services.GetRequiredService<DatabaseService>();

        await host.RunAsync();
    }
}
