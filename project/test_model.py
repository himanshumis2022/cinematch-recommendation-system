import traceback
try:
    from recommendation_model import available_titles, recommend
    titles = available_titles()
    print('titles_count=', len(titles))
    for t in titles[:20]:
        print(t)
except Exception:
    traceback.print_exc()
