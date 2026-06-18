import os
import time
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "feed_cache.xml"
CACHE_DURATION = 3600  # Cache for 1 hour by default

def fetch_feed_data(force_refresh=False):
    """Fetches the XML feed data, using cache if fresh enough and not forced."""
    cache_exists = os.path.exists(CACHE_FILE)
    
    if cache_exists and not force_refresh:
        # Check cache age
        mtime = os.path.getmtime(CACHE_FILE)
        if time.time() - mtime < CACHE_DURATION:
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception as e:
                app.logger.error(f"Error reading cache: {e}")

    # Fetch live data
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        xml_content = response.text
        
        # Save to cache
        try:
            with open(CACHE_FILE, "w", encoding="utf-8") as f:
                f.write(xml_content)
        except Exception as e:
            app.logger.error(f"Error writing cache: {e}")
            
        return xml_content
    except Exception as e:
        app.logger.error(f"Error fetching live feed: {e}")
        # Fall back to cache if live fetch fails
        if cache_exists:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return f.read()
        raise e

def parse_xml_feed(xml_data):
    """Parses the Atom feed XML and extracts individual release items."""
    namespaces = {'atom': 'http://www.w3.org/2005/Atom'}
    
    # Clean up XML string encoding declaration if ET raises parse errors
    try:
        root = ET.fromstring(xml_data.encode('utf-8'))
    except Exception as e:
        # If encoding issues, try parsing directly as string
        root = ET.fromstring(xml_data)

    release_notes = []
    
    for entry in root.findall('atom:entry', namespaces):
        # Extract metadata
        date_str = entry.find('atom:title', namespaces)
        date_str = date_str.text.strip() if date_str is not None else "Unknown Date"
        
        updated_str = entry.find('atom:updated', namespaces)
        updated_str = updated_str.text.strip() if updated_str is not None else ""
        
        link_el = entry.find('atom:link[@rel="alternate"]', namespaces)
        entry_link = link_el.attrib['href'] if link_el is not None else ""
        
        content_el = entry.find('atom:content', namespaces)
        if content_el is None or not content_el.text:
            continue
            
        html_content = content_el.text
        soup = BeautifulSoup(html_content, 'html.parser')
        
        h3s = soup.find_all('h3')
        if not h3s:
            # No h3 tags inside, parse whole content as single item
            text_content = soup.get_text().strip()
            release_notes.append({
                'date': date_str,
                'updated': updated_str,
                'category': 'General',
                'content_html': html_content.strip(),
                'content_text': text_content,
                'primary_link': entry_link,
                'entry_link': entry_link
            })
        else:
            for h3 in h3s:
                category = h3.get_text().strip()
                
                # Gather siblings until next h3
                siblings = []
                sibling = h3.next_sibling
                while sibling and sibling.name != 'h3':
                    siblings.append(sibling)
                    sibling = sibling.next_sibling
                
                # Render accumulated HTML content
                item_html = "".join(str(s) for s in siblings).strip()
                
                # Parse siblings with BS4 to extract plaintext and URLs
                sibling_soup = BeautifulSoup(item_html, 'html.parser')
                item_text = sibling_soup.get_text().strip()
                
                # Clean up multiple whitespaces
                item_text = " ".join(item_text.split())
                
                # Extract the first useful hyperlink as the primary reference link
                primary_link = entry_link
                for a_tag in sibling_soup.find_all('a'):
                    if 'href' in a_tag.attrs:
                        href = a_tag['href']
                        # Ignore general product launch stage links as primary reference
                        if not href.startswith('https://cloud.google.com/products') and not href.startswith('https://cloud.google.com/blog'):
                            primary_link = href
                            break
                
                release_notes.append({
                    'date': date_str,
                    'updated': updated_str,
                    'category': category,
                    'content_html': item_html,
                    'content_text': item_text,
                    'primary_link': primary_link,
                    'entry_link': entry_link
                })
                
    return release_notes

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases', methods=['GET'])
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        xml_data = fetch_feed_data(force_refresh=force_refresh)
        releases = parse_xml_feed(xml_data)
        
        # Include statistics for the front-end dashboard
        categories = {}
        for r in releases:
            cat = r['category']
            categories[cat] = categories.get(cat, 0) + 1
            
        return jsonify({
            'status': 'success',
            'count': len(releases),
            'categories': categories,
            'releases': releases
        })
    except Exception as e:
        app.logger.exception("Error serving release notes api")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
