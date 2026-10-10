
import streamlit as st

st.set_page_config(
    page_title="Campus Connect",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Styling
st.markdown("""
<style>
.stApp {
    background: linear-gradient(135deg, #0b1220, #111c32);
    color: #f1f5f9;
}
[data-testid="stSidebar"] {
    background-color: #111827;
}
h1, h2, h3 {
    color: #60a5fa;
}
[data-testid="stMetric"] {
    background: #1e293b;
    padding: 18px;
    border-radius: 12px;
    border: 1px solid #334155;
}
</style>
""", unsafe_allow_html=True)

# Sidebar navigation
st.sidebar.title("🎓 Campus Connect")
st.sidebar.caption("Student Portal")

page = st.sidebar.radio(
    "Navigation",
    [
        "Dashboard",
        "Attendance",
        "Placements",
        "Events",
        "Notes",
        "Results",
        "Profile"
    ]
)

st.sidebar.divider()
st.sidebar.info("Your campus, connected.")

# Dashboard
if page == "Dashboard":
    st.title("🎓 Welcome to Campus Connect")
    st.write("Your academic life, organized in one place.")

    col1, col2, col3 = st.columns(3)

    col1.metric("Attendance", "85%", "5%")
    col2.metric("Upcoming Events", "3")
    col3.metric("Placement Drives", "5")

    st.divider()
    st.subheader("📌 Quick Access")

    col1, col2 = st.columns(2)

    with col1:
        if st.button("📅 View Attendance", use_container_width=True):
            st.session_state["selected_page"] = "Attendance"
            st.rerun()

        if st.button("📝 View Notes", use_container_width=True):
            st.session_state["selected_page"] = "Notes"
            st.rerun()

    with col2:
        if st.button("💼 View Placements", use_container_width=True):
            st.session_state["selected_page"] = "Placements"
            st.rerun()

        if st.button("📊 View Results", use_container_width=True):
            st.session_state["selected_page"] = "Results"
            st.rerun()

    st.subheader("📢 Announcements")
    st.info("Check the Events section for upcoming campus activities.")
    st.success("Welcome back! Have a productive day.")

# Attendance
elif page == "Attendance":
    st.title("📅 Attendance")
    st.write("Track your subject-wise attendance.")

    attendance = {
        "Subject": ["Data Analytics", "Machine Learning",
                    "Cloud Computing", "Cyber Security"],
        "Attendance (%)": [88, 82, 91, 85]
    }
    st.dataframe(attendance, use_container_width=True)
    st.caption("Demo data — connect your database for actual attendance.")

# Placements
elif page == "Placements":
    st.title("💼 Placement Opportunities")

    st.subheader("Available Drives")
    st.write("**Software Developer** — Applications open")
    st.write("**Data Analyst Intern** — Applications open")
    st.write("**Python Developer** — Applications open")

    st.caption("Demo opportunities. Replace with live placement data.")

# Events
elif page == "Events":
    st.title("🎉 Campus Events")
    st.write("**Technical Fest** — Registration information coming soon.")
    st.write("**Coding Competition** — Stay tuned for updates.")
    st.write("**Career Guidance Session** — Check announcements.")

# Notes
elif page == "Notes":
    st.title("📝 Study Notes")

    subject = st.selectbox(
        "Select subject",
        ["Data Analytics", "Machine Learning",
         "Cloud Computing", "Cyber Security"]
    )

    notes = st.text_area(
        "Write or view your notes",
        placeholder="Enter your study notes here..."
    )

    if st.button("Save Notes"):
        st.session_state["notes_" + subject] = notes
        st.success("Notes saved for this session.")

    st.caption("Session notes are temporary. Add database storage for persistence.")

# Results
elif page == "Results":
    st.title("📊 Academic Results")
    st.write("View your semester results here.")

    st.info("Connect your academic database to display actual marks and grades.")

# Profile
elif page == "Profile":
    st.title("👤 Student Profile")

    name = st.text_input("Student Name")
    roll_number = st.text_input("Roll Number")
    branch = st.selectbox("Branch", ["CSE", "ECE", "EEE", "MECH", "CIVIL"])

    if st.button("Save Profile"):
        st.success("Profile details updated for this session.")

# Footer
st.divider()
st.caption("Campus Connect | Student Portal")
