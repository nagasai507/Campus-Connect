# CampusConnect

> One campus. One connected experience.

![CampusConnect campus illustration](images/campus-hero.png)

CampusConnect is a responsive, multi-page campus portal concept that brings everyday student services into one place: academic progress, campus updates, career preparation, and quick access to student tools.

## Find Your Way Around

| Your day                | Open                                                                          |
| ----------------------- | ----------------------------------------------------------------------------- |
| Start at the campus hub | [Home](index.html) · [Dashboard](dashboard.html) · [Profile](profile.html)    |
| Keep up with coursework | [Attendance](attendance.html) · [Results](results.html) · [Notes](notes.html) |
| See what's happening    | [Events](events.html) · [Bus](bus.html) · [Analytics](analytics.html)         |
| Plan what comes next    | [Placement prep](placement.html) · [Campus assistant](chatbot.html)           |
| Enter the portal        | [Register](register.html) · [Login](login.html)                               |

## Run It Locally

There is no install or build step. Clone the repository and open `index.html` in a browser:

```bash
git clone https://github.com/nagasai507/Campus-Connect.git
cd Campus-Connect
```

Or serve the folder locally with Python:

```bash
python -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000). The pages load fonts, icons, and animation assets from CDNs, so an internet connection is needed for those external resources.

## Project Map

```text
CampusConnect/
|-- index.html          # Landing page
|-- dashboard.html      # Campus dashboard
|-- attendance.html     # Attendance
|-- results.html        # Results
|-- notes.html          # Notes
|-- events.html         # Events
|-- bus.html            # Bus information
|-- placement.html      # Placement preparation
|-- chatbot.html        # Campus assistant
|-- analytics.html      # Analytics
|-- login.html          # Login screen
|-- register.html       # Registration screen
|-- profile.html        # Student profile
|-- css/                # Page and shared styles
|-- js/                 # Browser-side interactions
`-- images/             # Campus artwork
```

## Built With

HTML, CSS, and browser-side JavaScript, with Google Fonts, Font Awesome, and AOS loaded from their respective CDNs.
